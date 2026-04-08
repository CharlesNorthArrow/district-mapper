// Renders a single scored bill.
// sponsoredByYourRep flag shows a highlighted badge.

export default function BillCard({ bill }) {
  const scoreColor =
    bill.relevanceScore >= 80 ? '#e63947' :
    bill.relevanceScore >= 50 ? '#f5a800' :
    '#467c9d';

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderLeft: `4px solid ${scoreColor}`,
      borderRadius: 6,
      padding: '14px 16px',
      marginBottom: 12,
      background: '#fff',
      fontFamily: "'Open Sans', sans-serif",
    }}>
      {/* Score + title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <span style={{
          background: scoreColor,
          color: '#fff',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {bill.relevanceScore}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1c3557', lineHeight: 1.3 }}>
          {bill.identifier} — {bill.title}
        </span>
      </div>

      {/* Your rep badge */}
      {bill.sponsoredByYourRep && (
        <div style={{
          display: 'inline-block',
          background: '#f2f8ee',
          border: '1px solid #a9dadc',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          color: '#1c3557',
          fontWeight: 600,
          marginBottom: 8,
        }}>
          ★ Sponsored by your district's rep
        </div>
      )}

      {/* Status */}
      <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        {bill.status} · {bill.lastActionDate || ''}
        {bill.primarySponsor ? ` · ${bill.primarySponsor}` : ''}
      </p>

      {/* Plain summary */}
      <p style={{ fontSize: 13, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>
        {bill.plainSummary}
      </p>

      {/* Relevance reason */}
      <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 8 }}>
        {bill.relevanceReason}
      </p>

      {/* Suggested action */}
      <div style={{
        background: '#f7f9fc',
        borderRadius: 4,
        padding: '8px 10px',
        fontSize: 12,
        color: '#1c3557',
        marginBottom: 10,
      }}>
        💡 {bill.suggestedAction}
      </div>

      {/* View bill link */}
      <a
        href={bill.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, color: '#e63947', fontWeight: 600, textDecoration: 'none' }}
      >
        View full bill ↗
      </a>
    </div>
  );
}
