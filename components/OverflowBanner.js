export default function OverflowBanner({ overflowCount, onUpgrade, onDismiss }) {
  if (!overflowCount || overflowCount <= 0) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      background: '#1c3557',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "'Open Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      maxWidth: 540,
      whiteSpace: 'nowrap',
    }}>
      <span>
        <strong>{overflowCount.toLocaleString()} rows</strong> in your file weren't analyzed.
      </span>
      <button
        onClick={onUpgrade}
        style={{
          background: '#e63947',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        Upgrade to analyze all
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#a9dadc',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
