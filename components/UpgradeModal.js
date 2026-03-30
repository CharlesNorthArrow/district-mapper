import { useState } from 'react';

export default function UpgradeModal({ onClose }) {
  const [form, setForm] = useState({ name: '', org: '', title: '', email: '', useCase: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' }}>
            Request Unlimited Access
          </h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {status === 'success' ? (
          <div style={body}>
            <div style={successBox}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#166534', margin: '0 0 6px' }}>Request received!</p>
              <p style={{ fontSize: 13, color: '#4a5568', margin: 0 }}>
                We'll be in touch within <strong>5 business days</strong>. A confirmation has been sent to {form.email}.
              </p>
            </div>
            <button style={primaryBtn} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form style={body} onSubmit={handleSubmit}>
            <p style={hint}>
              Tell us a bit about yourself and how you plan to use District Mapper — we'll get you set up.
            </p>

            <div style={fieldGroup}>
              <label style={fieldLabel}>Your name</label>
              <input
                style={input}
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={fieldGroup}>
              <label style={fieldLabel}>Organization</label>
              <input
                style={input}
                placeholder="e.g. Community Action Network"
                value={form.org}
                onChange={(e) => setField('org', e.target.value)}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={fieldLabel}>Your title / role</label>
              <input
                style={input}
                placeholder="e.g. Director of Programs"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={fieldLabel}>Email address</label>
              <input
                style={input}
                type="email"
                placeholder="jane@organization.org"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={fieldLabel}>How will you use District Mapper?</label>
              <textarea
                style={{ ...input, height: 80, resize: 'vertical' }}
                placeholder="Describe your use case and the size of datasets you typically work with…"
                value={form.useCase}
                onChange={(e) => setField('useCase', e.target.value)}
                required
              />
            </div>

            {errorMsg && <p style={errorStyle}>{errorMsg}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" style={primaryBtn} disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending…' : 'Send Request'}
              </button>
              <button type="button" style={cancelBtn} onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1100,
};
const modal = {
  background: '#fff', borderRadius: 6,
  width: 440, maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
  display: 'flex', flexDirection: 'column',
  maxHeight: '90vh', overflowY: 'auto',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #dde3ea',
};
const closeBtn = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6',
};
const body = { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 };
const hint = { fontSize: 13, color: '#4a5568', margin: 0 };
const errorStyle = { fontSize: 13, color: '#e63947', margin: 0 };
const fieldGroup = { display: 'flex', flexDirection: 'column', gap: 4 };
const fieldLabel = { fontSize: 12, fontWeight: 600, color: '#1c3557' };
const input = {
  padding: '7px 10px', border: '1px solid #c5d0da', borderRadius: 4,
  fontSize: 13, fontFamily: "'Open Sans', sans-serif",
  width: '100%', boxSizing: 'border-box',
};
const primaryBtn = {
  padding: '9px 18px',
  background: '#e63947', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const cancelBtn = {
  background: 'none', border: 'none', fontSize: 12, color: '#7a8fa6',
  cursor: 'pointer', padding: 0, textDecoration: 'underline',
};
const successBox = {
  background: '#dcfce7', border: '1px solid #bbf7d0',
  borderRadius: 6, padding: '20px 16px',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  textAlign: 'center',
};
