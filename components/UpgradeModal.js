import { useState } from 'react';

const PRO_FEATURES = [
  'Up to 5,000 addresses per upload',
  'Unlimited lat/lon rows',
  'CSV + PDF report exports',
  'AI-driven Policy bills scanning and tracking',
  'All Legislative Geographies',
  'City council districts (16 cities)',
];

const ENTERPRISE_FEATURES = [
  'Everything in Pro',
  'Unlimited rows',
  'Custom geographies',
  'Tailored interface & branding',
  'Dedicated North Arrow support',
];

export default function UpgradeModal({ onClose, onUnlock, authProfile }) {
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [form, setForm] = useState({ name: '', org: '', title: '', email: '', useCase: '' });
  const [formStatus, setFormStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(null); // null | 'monthly' | 'annual'
  const [checkoutError, setCheckoutError] = useState('');

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubscribe(plan) {
    setCheckoutLoading(plan);
    setCheckoutError('');
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location = data.url;
      } else {
        setCheckoutError(data.error || 'Something went wrong — please try again.');
        setCheckoutLoading(null);
      }
    } catch {
      setCheckoutError('Something went wrong — please try again.');
      setCheckoutLoading(null);
    }
  }

  async function handleEnterpriseSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.org.trim() || !form.title.trim() || !form.email.trim() || !form.useCase.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setFormStatus('submitting');
    try {
      const res = await fetch('/api/request-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      setFormStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong — please try again.');
      setFormStatus('idle');
    }
  }

  async function handleUnlockSubmit(e) {
    e.preventDefault();
    setUnlockError('');
    setUnlockSubmitting(true);
    try {
      if (authProfile?.loggedIn) {
        const res = await fetch('/api/auth/redeem-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: unlockInput }),
        });
        const data = await res.json();
        if (data.ok) {
          setUnlockSuccess(true);
          onUnlock?.(data.tier);
          setTimeout(onClose, 1200);
        } else {
          setUnlockError(data.error || 'Invalid code.');
        }
      } else {
        const res = await fetch('/api/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: unlockInput }),
        });
        const data = await res.json();
        if (data.ok) {
          onUnlock?.('enterprise');
          onClose();
        } else {
          setUnlockError('Incorrect code.');
        }
      }
    } catch {
      setUnlockError('Something went wrong — please try again.');
    } finally {
      setUnlockSubmitting(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>
            {showEnterpriseForm ? 'Contact North Arrow' : 'Upgrade to Pro'}
          </h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={body}>
          {/* Enterprise form success */}
          {formStatus === 'success' ? (
            <div style={successBox}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#166534', margin: '0 0 6px' }}>Request received!</p>
              <p style={{ fontSize: 13, color: '#4a5568', margin: '0 0 16px' }}>
                We'll be in touch within <strong>5 business days</strong>. A confirmation has been sent to {form.email}.
              </p>
              <button style={primaryBtn} onClick={onClose}>Close</button>
            </div>

          /* Enterprise contact form */
          ) : showEnterpriseForm ? (
            <>
              <button style={backBtn} onClick={() => { setShowEnterpriseForm(false); setErrorMsg(''); setFormStatus('idle'); }}>← Back to plans</button>
              <p style={hint}>Tell us about your organization and we'll be in touch about Enterprise pricing.</p>
              <form style={formWrap} onSubmit={handleEnterpriseSubmit}>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Your name</label>
                  <input style={input} placeholder="Jane Smith" value={form.name} onChange={(e) => setField('name', e.target.value)} required autoFocus />
                </div>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Organization</label>
                  <input style={input} placeholder="e.g. Community Action Network" value={form.org} onChange={(e) => setField('org', e.target.value)} required />
                </div>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Your title / role</label>
                  <input style={input} placeholder="e.g. Director of Programs" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
                </div>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Email address</label>
                  <input style={input} type="email" placeholder="jane@organization.org" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
                </div>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>How will you use District Mapper?</label>
                  <textarea
                    style={{ ...input, height: 72, resize: 'vertical' }}
                    placeholder="Describe your use case and dataset sizes…"
                    value={form.useCase}
                    onChange={(e) => setField('useCase', e.target.value)}
                    required
                  />
                </div>
                {errorMsg && <p style={errorStyle}>{errorMsg}</p>}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button type="submit" style={{ ...primaryBtn, background: '#1c3557' }} disabled={formStatus === 'submitting'}>
                    {formStatus === 'submitting' ? 'Sending…' : 'Send Request'}
                  </button>
                  <button type="button" style={cancelBtn} onClick={() => { setShowEnterpriseForm(false); setErrorMsg(''); }}>Cancel</button>
                </div>
              </form>
            </>

          /* Main plan selection view */
          ) : (
            <>
              <p style={hint}>Subscribe to Pro and unlock all layers, AI analysis, and PDF export.</p>

              <div style={cardsRow}>
                {/* Monthly */}
                <div style={card}>
                  <div style={cardTitle}>Monthly</div>
                  <div style={cardPrice}>$10 <span style={{ fontSize: 12, fontWeight: 500, color: '#7a8fa6' }}>/ mo</span></div>
                  <button
                    style={{ ...primaryBtn, opacity: checkoutLoading ? 0.7 : 1, background: '#1c3557', marginTop: 'auto' }}
                    disabled={!!checkoutLoading}
                    onClick={() => handleSubscribe('monthly')}
                  >
                    {checkoutLoading === 'monthly' ? 'Redirecting…' : 'Subscribe Monthly'}
                  </button>
                </div>

                {/* Annual */}
                <div style={{ ...card, borderColor: '#e63947' }}>
                  <div style={cardTitle}>Annual</div>
                  <div style={cardPrice}>$100 <span style={{ fontSize: 12, fontWeight: 500, color: '#7a8fa6' }}>/ yr</span></div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Save ~17% vs monthly</div>
                  <button
                    style={{ ...primaryBtn, opacity: checkoutLoading ? 0.7 : 1, marginTop: 'auto' }}
                    disabled={!!checkoutLoading}
                    onClick={() => handleSubscribe('annual')}
                  >
                    {checkoutLoading === 'annual' ? 'Redirecting…' : 'Subscribe Annually'}
                  </button>
                </div>
              </div>

              {checkoutError && <p style={errorStyle}>{checkoutError}</p>}

              {/* Enterprise secondary option */}
              <p style={{ fontSize: 12, color: '#7a8fa6', margin: 0, textAlign: 'center' }}>
                Need unlimited rows or custom geographies?{' '}
                <button style={linkBtn} onClick={() => setShowEnterpriseForm(true)}>
                  Contact us about Enterprise →
                </button>
              </p>

              {/* Code redemption toggle */}
              <div style={{ borderTop: '1px solid #eef0f3', paddingTop: 12 }}>
                <button style={linkBtn} onClick={() => setShowCodeInput((v) => !v)}>
                  {showCodeInput ? 'Hide code entry' : 'Have a code?'}
                </button>
                {showCodeInput && (
                  <form onSubmit={handleUnlockSubmit} style={{ ...unlockRow, marginTop: 8 }}>
                    <input
                      style={{ ...input, flex: 1, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}
                      type="text"
                      placeholder={authProfile?.loggedIn ? 'Enter invite code' : 'Enter access code'}
                      value={unlockInput}
                      onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(''); setUnlockSuccess(false); }}
                      autoFocus
                    />
                    <button type="submit" style={unlockBtn} disabled={!unlockInput.trim() || unlockSubmitting}>
                      {unlockSubmitting ? '…' : 'Redeem'}
                    </button>
                  </form>
                )}
                {unlockSuccess && <p style={{ fontSize: 12, color: '#16a34a', margin: '6px 0 0' }}>Code applied! Your plan has been upgraded.</p>}
                {unlockError && <p style={{ ...errorStyle, marginTop: 6 }}>{unlockError}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 };
const modal = { background: '#fff', borderRadius: 8, width: 520, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #dde3ea' };
const modalTitle = { margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6' };
const body = { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 };
const hint = { fontSize: 13, color: '#4a5568', margin: 0 };
const backBtn = { background: 'none', border: 'none', color: '#467c9d', cursor: 'pointer', fontSize: 12, padding: 0, textAlign: 'left' };
const linkBtn = { background: 'none', border: 'none', color: '#467c9d', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline', fontFamily: "'Open Sans', sans-serif" };
const cardsRow = { display: 'flex', gap: 12 };
const card = { flex: 1, border: '1px solid #dde3ea', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };
const cardTitle = { fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const cardPrice = { fontSize: 22, fontWeight: 700, color: '#1c3557', lineHeight: 1.2 };
const featureList = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 };
const featureItem = { display: 'flex', gap: 6, fontSize: 12, color: '#374151', alignItems: 'flex-start' };
const checkmark = { color: '#16a34a', fontWeight: 700, flexShrink: 0 };
const formWrap = { display: 'flex', flexDirection: 'column', gap: 10 };
const fieldGroup = { display: 'flex', flexDirection: 'column', gap: 3 };
const fieldLabel = { fontSize: 12, fontWeight: 600, color: '#1c3557' };
const input = { padding: '7px 10px', border: '1px solid #c5d0da', borderRadius: 4, fontSize: 13, fontFamily: "'Open Sans', sans-serif", width: '100%', boxSizing: 'border-box' };
const primaryBtn = { padding: '9px 18px', background: '#e63947', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" };
const cancelBtn = { background: 'none', border: 'none', fontSize: 12, color: '#7a8fa6', cursor: 'pointer', padding: 0, textDecoration: 'underline' };
const errorStyle = { fontSize: 12, color: '#e63947', margin: 0 };
const successBox = { background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' };
const unlockRow = { display: 'flex', gap: 8 };
const unlockBtn = { padding: '7px 14px', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Open Sans', sans-serif" };
