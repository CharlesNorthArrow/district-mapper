import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';

const FREE_FEATURES = [
  'Up to 500 addresses per upload',
  '2,500 lat/lon rows',
  'All Legislative Geographies',
  'CSV export',
  'Officials lookup',
];

const PRO_FEATURES = [
  'Up to 5,000 addresses per upload',
  'Unlimited lat/lon rows',
  'CSV + PDF report exports',
  'AI-driven Policy bills scanning and tracking',
];

export default function PreAuthModal({ onClose, context }) {
  const { openSignUp, openSignIn } = useClerk();
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);

  function handleFree() {
    onClose();
    openSignUp({ afterSignUpUrl: '/onboarding' });
  }

  function handlePro() {
    onClose();
    try { localStorage.setItem('dm_signup_intent', 'pro'); } catch {}
    openSignUp({ afterSignUpUrl: '/onboarding' });
  }

  async function handleCodeContinue(e) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeError('');
    setCodeChecking(true);
    try {
      const res = await fetch(`/api/auth/check-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!data.valid) {
        setCodeError(data.error || 'Invalid or expired code.');
        setCodeChecking(false);
        return;
      }
      onClose();
      openSignUp({ afterSignUpUrl: `/onboarding?code=${encodeURIComponent(code)}` });
    } catch {
      setCodeError('Could not validate code — please try again.');
      setCodeChecking(false);
    }
  }

  function handleSignIn() {
    onClose();
    openSignIn({ afterSignInUrl: '/onboarding-check' });
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>Get started with District Mapper</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={body}>
          {context && <div style={contextBanner}>{context}</div>}

          {/* Plan cards */}
          <div style={cardsRow}>
            {/* Free */}
            <div style={card}>
              <div style={planName}>Free</div>
              <div style={planPrice}>No cost, forever</div>
              <ul style={featureList}>
                {FREE_FEATURES.map((f) => (
                  <li key={f} style={featureItem}><span style={check}>✓</span>{f}</li>
                ))}
              </ul>
              <button style={freeBtn} onClick={handleFree}>Sign up free →</button>
            </div>

            {/* Pro */}
            <div style={{ ...card, borderColor: '#e63947' }}>
              <div style={planName}>Pro</div>
              <div style={{ ...planPrice, color: '#e63947' }}>$10 / mo · $100 / yr</div>
              <ul style={featureList}>
                {PRO_FEATURES.map((f) => (
                  <li key={f} style={featureItem}><span style={check}>✓</span>{f}</li>
                ))}
              </ul>
              <button style={proBtn} onClick={handlePro}>Subscribe to Pro →</button>
            </div>
          </div>

          {/* Invite code */}
          <div style={sectionDivider}>
            <div style={sectionLabel}>Have an invite code?</div>
            <form style={codeRow} onSubmit={handleCodeContinue}>
              <input
                style={codeInput_}
                type="text"
                placeholder="Enter code"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
                autoComplete="off"
              />
              <button
                type="submit"
                style={codeBtn}
                disabled={!codeInput.trim() || codeChecking}
              >
                {codeChecking ? '…' : 'Continue →'}
              </button>
            </form>
            {codeError && <p style={errorText}>{codeError}</p>}
          </div>

          {/* Serviced / White Label */}
          <div style={sectionDivider}>
            <div style={sectionLabel}>Need White Label or a Serviced account?</div>
            <p style={servicedText}>
              Contact us at{' '}
              <a href="mailto:charles@north-arrow.org" style={emailLink}>
                charles@north-arrow.org
              </a>
            </p>
          </div>

          {/* Sign in */}
          <p style={signInPrompt}>
            Already a member?{' '}
            <button style={linkBtn} onClick={handleSignIn}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 };
const modal = { background: '#fff', borderRadius: 8, width: 560, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #dde3ea' };
const modalTitle = { margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6' };
const body = { padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 0 };
const contextBanner = { background: '#eef6fb', border: '1px solid #a9dadc', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#1c3557', fontWeight: 600, marginBottom: 16 };
const cardsRow = { display: 'flex', gap: 12, marginBottom: 20 };
const card = { flex: 1, border: '1px solid #dde3ea', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 };
const planName = { fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const planPrice = { fontSize: 12, fontWeight: 600, color: '#7a8fa6' };
const featureList = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 };
const featureItem = { display: 'flex', gap: 6, fontSize: 12, color: '#374151', alignItems: 'flex-start' };
const check = { color: '#16a34a', fontWeight: 700, flexShrink: 0 };
const freeBtn = { padding: '9px 0', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif", width: '100%' };
const proBtn = { padding: '9px 0', background: '#e63947', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif", width: '100%' };
const sectionDivider = { borderTop: '1px solid #eef0f3', paddingTop: 14, paddingBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 };
const sectionLabel = { fontSize: 12, fontWeight: 700, color: '#1c3557' };
const codeRow = { display: 'flex', gap: 8 };
const codeInput_ = { flex: 1, padding: '8px 10px', border: '1px solid #c5d0da', borderRadius: 4, fontSize: 13, fontFamily: "'Open Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 1 };
const codeBtn = { padding: '8px 14px', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Open Sans', sans-serif" };
const errorText = { fontSize: 12, color: '#e63947', margin: 0 };
const servicedText = { fontSize: 13, color: '#4a5568', margin: 0 };
const emailLink = { color: '#467c9d', textDecoration: 'none', fontWeight: 600 };
const signInPrompt = { fontSize: 12, color: '#7a8fa6', margin: '14px 0 0', textAlign: 'center' };
const linkBtn = { background: 'none', border: 'none', color: '#467c9d', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline', fontFamily: "'Open Sans', sans-serif" };
