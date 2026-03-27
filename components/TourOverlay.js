import { useState } from 'react';

const STEPS = [
  {
    icon: '📤',
    title: 'Upload Your Data',
    body: 'Import a CSV or Excel file with your constituent or program data. District Mapper auto-detects coordinate columns or address fields and geocodes them — no manual column mapping required.',
  },
  {
    icon: '🗺️',
    title: 'Add Boundary Layers',
    body: 'Use the left panel to toggle boundary layers: US Congressional Districts, State Senate & House, Unified or Elementary School Districts, and City Council districts for 16 major cities.',
  },
  {
    icon: '📊',
    title: 'Analyze the Distribution',
    body: 'Once data and layers are loaded, the analysis panel shows how your records are distributed across each district — count, percentage, and averages for any numeric fields in your file.',
  },
  {
    icon: '🔍',
    title: 'Look Up Any Address',
    body: 'Type any address at the top of the left panel to pin it on the map and instantly see every district it falls in — no file upload needed. Autocomplete makes it fast.',
  },
  {
    icon: '🎯',
    title: 'Filter & Explore',
    body: 'Click any district row in the analysis table to filter the map to just those points and zoom to the district boundary. Click the same row again to reset the view.',
  },
  {
    icon: '⬇️',
    title: 'Export Your Results',
    body: 'Check one or more districts in the analysis table and click Download CSV to get a filtered dataset. Or use the full export to download your original data enriched with all district columns appended.',
  },
];

export default function TourOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</span>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close tour">✕</button>
        </div>

        {/* Dots */}
        <div style={styles.dots}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              style={{ ...styles.dot, ...(i === step ? styles.dotActive : {}) }}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.icon}>{current.icon}</div>
          <h2 style={styles.title}>{current.title}</h2>
          <p style={styles.body}>{current.body}</p>
        </div>

        {/* Navigation */}
        <div style={styles.nav}>
          <button
            style={{ ...styles.navBtn, ...styles.navBtnSecondary, visibility: isFirst ? 'hidden' : 'visible' }}
            onClick={() => setStep((s) => s - 1)}
          >
            ← Back
          </button>
          {isLast ? (
            <button style={{ ...styles.navBtn, ...styles.navBtnPrimary }} onClick={onClose}>
              Get started →
            </button>
          ) : (
            <button style={{ ...styles.navBtn, ...styles.navBtnPrimary }} onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          )}
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
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    width: 440,
    maxWidth: 'calc(100vw - 32px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 0',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#7a8fa6',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: "'Open Sans', sans-serif",
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#7a8fa6',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  dots: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    padding: '14px 20px 0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#dde3ea',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
  },
  dotActive: {
    background: '#e63947',
    width: 22,
    borderRadius: 4,
  },
  content: {
    padding: '28px 32px 20px',
    textAlign: 'center',
  },
  icon: {
    fontSize: 44,
    lineHeight: 1,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#1c3557',
    margin: '0 0 12px',
  },
  body: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 1.7,
    margin: 0,
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 24px 24px',
    gap: 12,
  },
  navBtn: {
    padding: '9px 20px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Open Sans', sans-serif",
    border: 'none',
  },
  navBtnPrimary: {
    background: '#e63947',
    color: '#fff',
  },
  navBtnSecondary: {
    background: '#f0f4f8',
    color: '#1c3557',
  },
};
