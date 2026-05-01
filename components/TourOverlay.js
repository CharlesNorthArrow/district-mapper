import { useState } from 'react';

const STEPS = [
  {
    icon: '🗺️',
    title: 'Welcome to District Mapper',
    body: 'District Mapper makes sense of the US\'s many overlapping geographies. Upload your program or member data, select districts you\'re interested in, see distribution and export in minutes.',
  },
  {
    icon: '📤',
    title: 'Upload Your Data',
    body: 'Import a CSV or Excel file with your constituent or program data.',
  },
  {
    icon: '🗺️',
    title: 'Select a District Type',
    body: 'Use the pick list to select a legislative district or other geography.',
  },
  {
    icon: '📊',
    title: 'Analyze the Distribution',
    body: 'The analysis panel shows how your records are distributed across each district.',
  },
  {
    icon: '🔍',
    title: 'Look Up an Address',
    body: 'Use the search bar to locate an address.',
  },
  {
    icon: '🎯',
    title: 'Filter & Explore',
    body: 'Click any district in the analysis table to zoom in.',
  },
  {
    icon: '🏛️',
    title: 'Scan Policies',
    body: 'For any Congressional, State Senate, or State Assembly district, click the Scan Policies button on that row. Policy Pulse uses your mission description to find and score active legislation ranked by relevance to your work.',
  },
  {
    icon: '⬇️',
    title: 'Export Your Results',
    body: 'Enrich your original data with the matched districts as new columns. Alternatively, download a simple PDF report.',
  },
];

export default function TourOverlay({ onClose }) {
  const [step, setStep] = useState(0);

  function handleDontShowAgain() {
    try { localStorage.setItem('dm_tour_dismissed', '1'); } catch {}
    onClose();
  }
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitles}>
            <h1 style={styles.modalTitle}>How to use District Mapper</h1>
            <span style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</span>
          </div>
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
          <button style={styles.dontShowBtn} onClick={handleDontShowAgain}>
            Don't show again
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
    alignItems: 'flex-start',
    padding: '20px 20px 0',
    borderBottom: '1px solid #eef1f4',
    paddingBottom: 16,
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  modalTitle: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 17,
    color: '#1c3557',
    margin: 0,
    lineHeight: 1.2,
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
  dontShowBtn: {
    background: 'none',
    border: 'none',
    fontSize: 11,
    color: '#a0aec0',
    cursor: 'pointer',
    fontFamily: "'Open Sans', sans-serif",
    textDecoration: 'underline',
    padding: '4px 0',
  },
};
