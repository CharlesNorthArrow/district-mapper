import { useEffect, useState } from 'react';

export default function OliviaFab({ onClick }) {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('dm_intro_fab_pulsed') !== '1') {
        setShouldPulse(true);
        const t = setTimeout(() => {
          setShouldPulse(false);
          try { localStorage.setItem('dm_intro_fab_pulsed', '1'); } catch {}
        }, 6500); // ~3 pulse cycles at 2.2s each
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  function handleClick() {
    setShouldPulse(false);
    try { localStorage.setItem('dm_intro_fab_pulsed', '1'); } catch {}
    onClick();
  }

  return (
    <>
      <style jsx global>{`
        @keyframes oliviaFabPulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(1.6); opacity: 0;    }
          100% { transform: scale(1.6); opacity: 0;    }
        }
      `}</style>

      <div
        style={styles.wrap}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button
          onClick={handleClick}
          aria-label="Watch the 2-minute tour"
          style={styles.fab}
        >
          {shouldPulse && <span style={styles.pulseRing} />}
          <img
            src="/olivia.png"
            alt=""
            style={styles.avatar}
          />
        </button>

        {tooltipVisible && (
          <span style={styles.tooltip}>Watch 2-min tour</span>
        )}
      </div>
    </>
  );
}

const styles = {
  wrap: {
    position: 'absolute',
    top: 12,
    right: 56,
    zIndex: 6,
    width: 48,
    height: 48,
  },
  tooltip: {
    position: 'absolute',
    top: '50%',
    right: '100%',
    marginRight: 10,
    transform: 'translateY(-50%)',
    background: '#1c3557',
    color: '#fff',
    fontFamily: "'Open Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 10px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    pointerEvents: 'none',
  },
  fab: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '3px solid #fff',
    background: '#1c3557',
    padding: 0,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(28,53,87,0.35)',
    overflow: 'visible',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  },
  pulseRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: '50%',
    background: '#e63947',
    animation: 'oliviaFabPulse 2.2s ease-out infinite',
    pointerEvents: 'none',
    zIndex: -1,
  },
};
