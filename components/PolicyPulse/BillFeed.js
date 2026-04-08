// Renders the full bill list with loading + empty states.

import BillCard from './BillCard';

export default function BillFeed({ bills, loading, error }) {
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Open Sans', sans-serif", color: '#555' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
        <p style={{ fontSize: 13 }}>Scanning legislation…</p>
        <p style={{ fontSize: 12, color: '#888' }}>This takes about 15 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#e63947', fontFamily: "'Open Sans', sans-serif", fontSize: 13 }}>
        {error}
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
