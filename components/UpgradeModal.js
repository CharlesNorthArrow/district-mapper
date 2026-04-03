import { useState } from 'react';

const PRO_FEATURES = [
  'Up to 5,000 addresses per upload',
  'Unlimited lat/lon rows',
  'PDF report export',
  'AI plain language analysis',
  'All boundary layers',
  'City council districts (16 cities)',
];

const ENTERPRISE_FEATURES = [
  'Everything in Pro',
  'Unlimited rows',
  'Custom geographies',
  'Tailored interface & branding',
  'Dedicated North Arrow support',
];

export default function UpgradeModal({ onClose, onUnlock }) {
  const [selectedPlan, setSelectedPlan] = useState(null); // null | 'pro' | 'enterprise'
  const [form, setForm] = useState({ name: '', org: '', title: '', email: '', useCase: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.org.trim() || !form.title.trim() || !form.email.trim() || !form.useCase.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setStatus('submitting');
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
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong — please try again.');
      setStatus('idle');
    }
  }

  async function handleUnlockSubmit(e) {
    e.preventDefault();
    setUnlockError(false);
    setUnlockSubmitting(true);
    try {
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
        setUnlockError(true);
      }
    } catch {
      setUnlockError(true);
    } finally {
      setUnlockSubmitting(false);
    }
  }

  function backToPlans() {
    setSelectedPlan(null);
    setErrorMsg('');
    setStatus('idle');
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>Upgrade District Mapper</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={body}>
          {status === 'success' ? (
            <div style={successBox}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#166534', margin: '0 0 6px' }}>Request received!</p>
              <p style={{ fontSize: 13, color: '#4a5568', margin: '0 0 16px' }}>
                We'll be in touch within <strong>5 business days</strong>. A confirmation has been sent to {form.email}.
              </p>
              <button style={primaryBtn} onClick={onClose}>Close</button>
            </div>
          ) : selectedPlan ? (
            <>
              <button style={backBtn} onClick={backToPlans}>← Back to plans</button>
              <p style={hint}>
                {selectedPlan === 'pro'
                  ? "Tell us about yourself and we'll set up your Pro access."
                  : "Tell us about your organization and we'll be in touch about Enterprise pricing."}
              </p>
              <form style={formWrap} onSubmit={handleSubmit}>
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
                  <button type="submit" style={primaryBtn} disabled={status === 'submitting'}>
                    {status === 'submitting' ? 'Sending…' : 'Send Request'}
                  </button>
                  <button type="button" style={cancelBtn} onClick={backToPlans}>Cancel</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p style={hint}>Choose the plan that fits your needs.</p>
              <div style={cardsRow}>
                <div style={card}>
                  <div style={cardHeader}>
                    <span style={cardTitle}>Pro</span>
                    <span style={cardPrice}>$15 / month</span>
                  </div>
                  <ul style={featureList}>
                    {PRO_FEATURES.map((f) => (
                      <li key={f} style={featureItem}><span style={checkmark}>✓</span>{f}</li>
                    ))}
                  </ul>
                  <button style={primaryBtn} onClick={() => setSelectedPlan('pro')}>
                    Request Pro Access
                  </button>
                </div>

                <div style={{ ...card, borderColor: '#1c3557' }}>
                  <div style={cardHeader}>
                    <span style={cardTitle}>Enterprise</span>
                    <span style={{ ...cardPrice, color: '#467c9d' }}>Contact us</span>
                  </div>
                  <ul style={featureList}>
                    {ENTERPRISE_FEATURES.map((f) => (
                      <li key={f} style={featureItem}><span style={checkmark}>✓</span>{f}</li>
                    ))}
                  </ul>
                  <button style={{ ...primaryBtn, background: '#1c3557' }} onClick={() => setSelectedPlan('enterprise')}>
                    Contact North Arrow
                  </button>
                </div>
              </div>

              <form onSubmit={handleUnlockSubmit} style={unlockRow}>
                <input
                  style={{ ...input, flex: 1, fontSize: 12 }}
                  type="password"
                  placeholder="Have an access code?"
                  value={unlockInput}
                  onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(false); }}
                />
                <button type="submit" style={unlockBtn} disabled={!unlockInput.trim() || unlockSubmitting}>
                  {unlockSubmitting ? '…' : 'Unlock'}
                </button>
              </form>
              {unlockError && <p style={errorStyle}>Incorrect code.</p>}
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
const cardsRow = { display: 'flex', gap: 12 };
const card = { flex: 1, border: '1px solid #dde3ea', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };
const cardTitle = { fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const cardPrice = { fontSize: 12, fontWeight: 600, color: '#e63947' };
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
