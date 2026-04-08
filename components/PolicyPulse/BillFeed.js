// Renders the full bill list with loading + empty states.

import BillCard from './BillCard';

const STEPS = [
  { key: 'keywords', label: 'Extracting search terms from your mission…' },
  { key: 'bills',    label: 'Searching NY legislation via Open States…' },
  { key: 'scoring',  label: null }, // label built dynamically using candidateCount
];

export default function BillFeed({ bills, loading, error, scanStep, candidateCount }) {
  if (loading) {
    const currentIndex = STEPS.findIndex(s => s.key === scanStep);

    return (
      <div style={{ padding: 24, fontFamily: "'Open Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
          <p style={{ fontSize: 13, color: '#333', fontWeight: 600, marginBottom: 4 }}>
            {scanStep === 'keywords' && 'Extracting search terms from your mission…'}
            {scanStep === 'bills'    && 'Searching NY legislation via Open States…'}
            {scanStep === 'scoring'  && (candidateCount ? `Scoring ${candidateCount} candidate bills for relevance…` : 'Scoring candidate bills for relevance…')}
            {!scanStep && 'Starting scan…'}
          </p>
          <p style={{ fontSize: 12, color: '#888' }}>This takes about 15–20 seconds</p>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, margin: '0 auto' }}>
          {STEPS.map((step, i) => {
            const done = currentIndex > i;
            const active = currentIndex === i;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: done ? '#1c3557' : active ? '#e63947' : '#e8edf2',
                  color: done || active ? '#fff' : '#aaa',
                  animation: active ? 'breathe 1.4s ease-in-out infinite' : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 12,
                  color: done ? '#1c3557' : active ? '#333' : '#aaa',
                  fontWeight: active ? 600 : 400,
                }}>
                  {i === 2 && candidateCount
                    ? `Scoring ${candidateCount} candidates for relevance`
                    : step.label || 'Scoring candidates for relevance'}
                </span>
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
      <p style={{
        fontFamily: "'Open Sans', sans-serif",
        fontSize: 12,
        color: '#888',
        marginBottom: 12,
      }}>
        {bills.length} relevant bill{bills.length !== 1 ? 's' : ''} found · Ranked by relevance
      </p>
      {bills.map(bill => <BillCard key={bill.id} bill={bill} />)}
    </div>
  );
}
