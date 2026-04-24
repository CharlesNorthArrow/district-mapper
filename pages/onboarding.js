import { useState } from 'react';
import { useRouter } from 'next/router';
import { STATE_FIPS } from '../lib/stateFips';

const US_STATE_NAMES = Object.keys(STATE_FIPS).sort();

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState({
    personName: '',
    orgName: '',
    title: '',
    state: '',
    newsletterOptIn: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.personName || !form.orgName || !form.title || !form.state) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setLoading(false); return; }
      router.replace('/');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f9fc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Open Sans', sans-serif",
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 10,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1c3557', fontFamily: "'Poppins', sans-serif", marginBottom: 6 }}>
            Welcome to District Mapper
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            Tell us a bit about you and your organization.
          </div>
        </div>

        {[
          { field: 'personName', label: 'Your name', placeholder: 'Jane Smith' },
          { field: 'orgName', label: 'Organization name', placeholder: 'Community Action Network' },
          { field: 'title', label: 'Your title', placeholder: 'Policy Director' },
        ].map(({ field, label, placeholder }) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{label}</label>
            <input
              style={inputStyle}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>State you primarily work in</label>
          <select
            style={{ ...inputStyle, background: '#fff' }}
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
          >
            <option value="">Select state…</option>
            {US_STATE_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 13, color: '#555' }}>
          <input
            type="checkbox"
            checked={form.newsletterOptIn}
            onChange={(e) => set('newsletterOptIn', e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          Subscribe to Making Space — our monthly memo on maps, data, and nonprofit strategy. Unsubscribe anytime.
        </label>

        {error && <p style={{ color: '#e63947', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#aaa' : '#e63947',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '11px 0',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Open Sans', sans-serif",
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Setting up…' : 'Get started →'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#1c3557',
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1.5px solid #a9dadc',
  borderRadius: 6,
  fontFamily: "'Open Sans', sans-serif",
  fontSize: 14,
  color: '#1c3557',
  outline: 'none',
};
