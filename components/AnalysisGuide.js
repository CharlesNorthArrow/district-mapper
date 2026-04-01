import { useState, useEffect, useCallback } from 'react';

const STEPS = [
  {
    target: 'filter-group',
    title: 'Filters',
    body: 'Narrow your analysis by "Program Data" (a field from your uploaded file) or by "District" (show only specific districts). Active filters apply to the analysis and the map.',
  },
  {
    target: 'export-controls',
    title: 'Export',
    body: 'Download an enriched CSV — your original data with district assignment columns added to each row — or generate a PDF summary report of the analysis.',
  },
  {
    target: 'layer-tabs',
    title: 'Layer Tabs',
    body: 'Switch between Overview (all active boundary layers at a glance) and individual tabs to drill into one layer\'s full district breakdown.',
  },
  {
    target: 'overview-cards',
    title: 'Overview Cards',
    body: 'Each card summarizes one boundary layer — how many districts contain your data points, plus the top 3 districts by count. Click "View details →" to open that layer\'s full table.',
  },
  {
    target: 'district-table',
    title: 'District Table',
    body: 'Click any district row to highlight it on the map. Check the boxes to select multiple districts, then download a filtered CSV containing only those rows.',
  },
];

const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 190;
const PAD = 8;
const GAP = 14;

function getHighlightRect(target) {
  const el = document.querySelector(`[data-guide="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
}

function getTooltipPosition(rect) {
  if (!rect) {
    return {
      top: window.innerHeight / 2 - TOOLTIP_HEIGHT / 2,
      left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
    };
  }
  // Prefer above the highlighted element; fall back to below
  const spaceAbove = rect.top - PAD - GAP;
  const top = spaceAbove >= TOOLTIP_HEIGHT
    ? rect.top - PAD - GAP - TOOLTIP_HEIGHT
    : rect.bottom + PAD + GAP;

  const left = Math.max(12, Math.min(rect.left - PAD, window.innerWidth - TOOLTIP_WIDTH - 12));
  return { top, left };
}

export default function AnalysisGuide({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const refreshRect = useCallback((stepIndex) => {
    const r = getHighlightRect(STEPS[stepIndex].target);
    setRect(r);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    // Wait one frame for any panel DOM updates before measuring
    const id = requestAnimationFrame(() => refreshRect(0));
    return () => cancelAnimationFrame(id);
  }, [open, refreshRect]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => refreshRect(step));
    const onResize = () => refreshRect(step);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [step, open, refreshRect]);

  if (!open) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const { top: tipTop, left: tipLeft } = getTooltipPosition(rect);

  function goTo(nextStep) {
    setStep(nextStep);
    const id = requestAnimationFrame(() => refreshRect(nextStep));
    return () => cancelAnimationFrame(id);
  }

  return (
    <>
      {/* Click-outside backdrop */}
      <div style={backdropStyle} onClick={onClose} />

      {/* Highlight cutout */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 6,
            boxShadow: '0 0 0 9999px rgba(28, 53, 87, 0.55)',
            border: '2px solid rgba(169, 218, 220, 0.85)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          position: 'fixed',
          top: tipTop,
          left: tipLeft,
          width: TOOLTIP_WIDTH,
          background: '#fff',
          borderRadius: 8,
          padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          zIndex: 1001,
          fontFamily: 'Open Sans, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7a8fa6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {step + 1} of {STEPS.length}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1c3557', fontFamily: 'Poppins, sans-serif', marginTop: 3 }}>
              {current.title}
            </div>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close guide">✕</button>
        </div>

        {/* Body */}
        <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.55, margin: '0 0 14px' }}>
          {current.body}
        </p>

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            style={{ ...navBtnOutline, opacity: isFirst ? 0.35 : 1, cursor: isFirst ? 'default' : 'pointer' }}
            onClick={() => !isFirst && goTo(step - 1)}
            disabled={isFirst}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? '#1c3557' : '#dde3ea',
                  transition: 'width 0.2s ease, background 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          {isLast ? (
            <button style={navBtnFill} onClick={onClose}>Done</button>
          ) : (
            <button style={navBtnFill} onClick={() => goTo(step + 1)}>Next →</button>
          )}
        </div>
      </div>
    </>
  );
}

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 999,
  cursor: 'default',
};
const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  color: '#7a8fa6',
  padding: 0,
  lineHeight: 1,
  marginTop: 2,
};
const navBtnOutline = {
  background: 'none',
  border: '1px solid #dde3ea',
  borderRadius: 4,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#1c3557',
  fontFamily: 'Open Sans, sans-serif',
};
const navBtnFill = {
  background: '#1c3557',
  border: 'none',
  borderRadius: 4,
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'Open Sans, sans-serif',
};
