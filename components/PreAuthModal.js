import { useClerk } from '@clerk/nextjs';

const FREE_FEATURES = [
  'Up to 500 addresses per upload',
  '2,500 lat/lon rows',
  'All boundary layers',
  'CSV export',
  'Officials lookup',
];

const PRO_FEATURES = [
  'Up to 5,000 addresses per upload',
  'Unlimited lat/lon rows',
  'PDF report export',
  'AI plain language analysis',
  'Policy Pulse bill tracking',
];

export default function PreAuthModal({ onClose, context }) {
  const { openSignUp, openSignIn } = useClerk();

  function handleSignUp() {
    onClose();
    openSignUp({ afterSignUpUrl: '/onboarding' });
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
          {context && (
            <div style={contextBanner}>{context}</div>
          )}
          <p style={description}>
            Upload your constituent or program data and instantly see how your people map
            to legislative districts, school boundaries, and more.
          </p>

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
            </div>

            {/* Pro */}
            <div style={{ ...card, borderColor: '#e63947' }}>
              <div style={planName}>Pro</div>
              <div style={{ ...planPrice, color: '#e63947' }}>$10 / month</div>
              <ul style={featureList}>
                {PRO_FEATURES.map((f) => (
                  <li key={f} style={featureItem}><span style={check}>✓</span>{f}</li>
                ))}
              </ul>
              <p style={proNote}>Subscribe to Pro anytime from within the app.</p>
            </div>
          </div>

          <button style={primaryBtn} onClick={handleSignUp}>
            Create free account →
          </button>

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
const modal = { background: '#fff', borderRadius: 8, width: 540, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #dde3ea' };
const modalTitle = { margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6' };
const body = { padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 };
const description = { fontSize: 13, color: '#4a5568', margin: 0, lineHeight: 1.6 };
const cardsRow = { display: 'flex', gap: 12 };
const card = { flex: 1, border: '1px solid #dde3ea', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 };
const planName = { fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const planPrice = { fontSize: 12, fontWeight: 600, color: '#7a8fa6' };
const featureList = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 };
const featureItem = { display: 'flex', gap: 6, fontSize: 12, color: '#374151', alignItems: 'flex-start' };
const check = { color: '#16a34a', fontWeight: 700, flexShrink: 0 };
const proNote = { fontSize: 11, color: '#7a8fa6', margin: 0 };
const contextBanner = { background: '#eef6fb', border: '1px solid #a9dadc', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#1c3557', fontWeight: 600 };
const primaryBtn = { padding: '11px 0', background: '#e63947', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif", width: '100%' };
const signInPrompt = { fontSize: 12, color: '#7a8fa6', margin: 0, textAlign: 'center' };
const linkBtn = { background: 'none', border: 'none', color: '#467c9d', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline', fontFamily: "'Open Sans', sans-serif" };
