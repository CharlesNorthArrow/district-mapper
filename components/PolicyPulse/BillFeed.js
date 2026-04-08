import { useState, useEffect } from 'react';
import BillCard from './BillCard';

const STEPS = [
  { key: 'keywords', label: 'Extracting search terms' },
  { key: 'bills',    label: 'Searching NY legislation' },
  { key: 'scoring',  label: 'Scoring for relevance' },
];

const CYCLING_MESSAGES = [
  "Reading active NY bills…",
  "Cross-referencing your mission keywords…",
  "Checking bill abstracts and sponsors…",
  "Filtering by policy relevance…",
  "Ranking matches for your district…",
  "Almost there…",
];

export default function BillFeed({ bills, loading, error, scanStep, candidateCount, isExpanded }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setMsgIndex(i => (i + 1) % CYCLING_MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, [loading]);

  if (loading) {
    const currentIndex = STEPS.findIndex(s => s.key === scanStep);

    return (
      <div style={{ padding: '32px 24px', fontFamily: "'Open Sans', sans-serif" }}>
        {/* Animated icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1c3557 0%, #467c9d 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 14,
            animation: 'breathe 2s ease-in-out infinite',
            boxShadow: '0 4px 16px rgba(28,53,87,0.25)',
          }}>
            🏛️
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1c3557', marginBottom: 4 }}>
            {CYCLING_MESSAGES[msgIndex]}
          </p>
          <p style={{ fontSize: 11, color: '#a0aec0' }}>~20 seconds · NY legislature · {new Date().getFullYear()}</p>
        </div>

        {/* Step progress */}
        <div style={{
          background: '#f7f9fc', borderRadius: 8, padding: '14px 16px',
          maxWidth: 340, margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {STEPS.map((step, i) => {
            const done = currentIndex > i;
            const active = currentIndex === i;
            const label = i === 2 && candidateCount
              ? `Scoring ${candidateCount} candidates`
              : step.label;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: done ? '#1c3557' : active ? '#e63947' : '#dde3ea',
                  color: done || active ? '#fff' : '#aaa',
                  transition: 'background 0.3s',
                  boxShadow: active ? '0 0 0 3px rgba(230,57,71,0.2)' : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 12,
                    color: done ? '#1c3557' : active ? '#1c3557' : '#a0aec0',
                    fontWeight: done || active ? 600 : 400,
                  }}>
                    {label}
                  </span>
                  {active && (
                    <div style={{
                      height: 2, background: '#edf2f7', borderRadius: 1, marginTop: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: '40%', background: '#e63947', borderRadius: 1,
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "'Open Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#e63947', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>
          Check that ANTHROPIC_API_KEY and OPEN_STATES_API_KEY are set in your environment.
        </p>
      </div>
    );
  }

  if (!bills?.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Open Sans', sans-serif", color: '#555', fontSize: 13 }}>
        No relevant bills found for this district and mission. Try editing your mission description.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 12, color: '#888', marginBottom: 12 }}>
        {bills.length} relevant bill{bills.length !== 1 ? 's' : ''} found · Ranked by relevance
      </p>
      <div style={isExpanded ? {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start',
      } : {}}>
        {bills.map(bill => <BillCard key={bill.id} bill={bill} />)}
      </div>
    </div>
  );
}
