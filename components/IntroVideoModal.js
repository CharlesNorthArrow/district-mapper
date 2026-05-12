import { useEffect } from 'react';

const LOOM_ID = '2dd5985fbbc94a4c9d8d4aafbcda1e49';

export default function IntroVideoModal({ onClose }) {
  function handleClose() {
    try { localStorage.setItem('dm_intro_video_seen', '1'); } catch {}
    onClose();
  }

  // Close on Escape for keyboard users
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={styles.backdrop} onClick={handleClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <img src="/olivia.png" alt="Olivia from North Arrow" style={styles.avatar} />
          <div style={styles.headerText}>
            <h2 style={styles.greeting}>Hi, I'm Olivia from North Arrow.</h2>
            <p style={styles.subline}>Here's a 2-minute tour of District Mapper.</p>
          </div>
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Close intro video">✕</button>
        </div>

        {/* Loom embed — sits flush below the header */}
        <div style={styles.videoWrap}>
          <iframe
            src={`https://www.loom.com/embed/${LOOM_ID}`}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen"
            style={styles.iframe}
            title="District Mapper tour"
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(28, 53, 87, 0.55)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    width: 960,
    maxWidth: 'calc(100vw - 32px)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.30)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    background: '#fff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    border: '2px solid #fff',
    boxShadow: '0 2px 8px rgba(28,53,87,0.18)',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#1c3557',
    margin: 0,
    lineHeight: 1.25,
  },
  subline: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: 13,
    color: '#4a5568',
    margin: '4px 0 0',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#7a8fa6',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  videoWrap: {
    position: 'relative',
    paddingBottom: '56.872037914691944%',
    height: 0,
    background: '#000',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 0,
    display: 'block',
  },
};
