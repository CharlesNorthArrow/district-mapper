// [EXPAND] Phase 1 stub — full standalone implementation in Phase 2
// For now renders a "coming soon" shell with the North Arrow nav

export default function PolicyPage() {
  return (
    <div style={{
      fontFamily: "'Open Sans', sans-serif",
      maxWidth: 640,
      margin: '80px auto',
      textAlign: 'center',
      padding: '0 24px',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🏛️</div>
      <h1 style={{ color: '#1c3557', fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>
        Policy Pulse
      </h1>
      <p style={{ color: '#555', fontSize: 15, marginBottom: 24 }}>
        Scan state legislation relevant to your nonprofit's mission.
        Start by uploading your constituent data in District Mapper —
        Policy Pulse is available directly from your district analysis.
      </p>
      <a
        href="/"
        style={{
          background: '#e63947',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Go to District Mapper →
      </a>
      <p style={{ marginTop: 32, fontSize: 12, color: '#aaa' }}>
        Standalone Policy Pulse — coming soon
      </p>
    </div>
  );
}
