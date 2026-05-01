import { useState } from 'react';
import { useRouter } from 'next/router';
import { STATE_FIPS } from '../lib/stateFips';

const US_STATE_NAMES = Object.keys(STATE_FIPS).sort();

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: 'No cost',
    features: ['Up to 500 addresses per upload', '2,500 lat/lon rows', 'All boundary layers', 'CSV export'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$15 / month',
    features: ['Up to 5,000 addresses per upload', 'Unlimited lat/lon rows', 'PDF report export', 'AI plain language analysis'],
  },
  {
    id: 'enterprise',
    label: 'Serviced',
    price: 'Contact us',
    features: ['Everything in Pro', 'Unlimited rows', 'Custom geographies', 'Tailored interface & branding', 'Dedicated North Arrow support'],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState({
    personName: '',
    orgName: '',
    title: '',
    state: '',
    newsletterOptIn: false,
  });
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [inviteCode, setInviteCode] = useState('');
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
        body: JSON.stringify({
          ...form,
          inviteCode: selectedPlan === 'pro' ? inviteCode.trim() : '',
          requestedPlan: selectedPlan,
        }),
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
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'Open Sans', sans-serif",
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 10,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1c3557', fontFamily: "'Poppins', sans-serif", marginBottom: 6 }}>
            Welcome to District Mapper
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            Tell us about you and your organization, then choose a plan.
          </div>
        </div>

        {/* Org details */}
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

        <div style={{ marginBottom: 20 }}>
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

        {/* Plan selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...labelStyle, marginBottom: 10, display: 'block' }}>Choose your plan</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  flex: 1,
                  border: `2px solid ${selectedPlan === plan.id ? '#1c3557' : '#dde3ea'}`,
                  borderRadius: 8,
                  padding: '12px 10px',
                  background: selectedPlan === plan.id ? '#f0f4f8' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c3557', marginBottom: 2 }}>{plan.label}</div>
                <div style={{ fontSize: 11, color: plan.id === 'pro' ? '#e63947' : '#7a8fa6', fontWeight: 600, marginBottom: 8 }}>{plan.price}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: 10, color: '#4a5568', display: 'flex', gap: 4 }}>
                      <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        {/* Pro: invite code */}
        {selectedPlan === 'pro' && (
          <div style={{ marginBottom: 16, background: '#f0f4f8', borderRadius: 6, padding: '12px 14px' }}>
            <label style={labelStyle}>Invite code</label>
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              placeholder="Enter your Pro invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <p style={{ fontSize: 11, color: '#7a8fa6', margin: '6px 0 0' }}>
              No code? You'll start on Free and can request Pro access from within the app.
            </p>
          </div>
        )}

        {/* Enterprise: contact note */}
        {selectedPlan === 'enterprise' && (
          <div style={{ marginBottom: 16, background: '#f0f4f8', borderRadius: 6, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: '#1c3557', margin: 0, fontWeight: 600 }}>We'll be in touch.</p>
            <p style={{ fontSize: 12, color: '#4a5568', margin: '4px 0 0' }}>
              Your account will start on Free. A North Arrow team member will reach out to discuss Serviced pricing and setup.
            </p>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 13, color: '#555' }}>
          <input
            type="checkbox"
            checked={form.newsletterOptIn}
            onChange={(e) => set('newsletterOptIn', e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          Subscribe to Making Space — our monthly memo on maps, data, and nonprofit strategy.
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
