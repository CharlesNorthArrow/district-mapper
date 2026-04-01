export default function ProcessingBar({ status }) {
  const { phase, done, total } = status;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      height: 36,
      background: '#1c3557',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 14,
      paddingRight: 14,
      overflow: 'hidden',
    }}>
      {/* Animated progress fill */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: `${pct}%`,
        background: '#a9dadc',
        opacity: 0.25,
        transition: 'width 0.2s ease',
        pointerEvents: 'none',
      }} />

      <span style={{
        position: 'relative',
        color: '#fff',
        fontSize: 12,
        fontFamily: "'Open Sans', sans-serif",
        fontWeight: 600,
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {phase}
      </span>

      <span style={{
        position: 'relative',
        color: '#a9dadc',
        fontSize: 12,
        fontFamily: "'Open Sans', sans-serif",
        fontWeight: 600,
        whiteSpace: 'nowrap',
        marginLeft: 12,
      }}>
        {done.toLocaleString()} of {total.toLocaleString()} · {pct}%
      </span>
    </div>
  );
}
