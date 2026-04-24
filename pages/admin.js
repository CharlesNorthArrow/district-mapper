export async function getServerSideProps(context) {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { clerkClient } = await import('@clerk/nextjs/server');
  const { sql } = await import('@vercel/postgres');

  const { userId } = getAuth(context.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const client = clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (email !== process.env.ADMIN_EMAIL) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const { rows: orgs } = await sql`
    SELECT o.org_name, o.person_name, o.title, o.state, o.email,
           o.tier, o.newsletter_opt_in, o.created_at,
           cr.redeemed_at, pc.label as code_label
    FROM orgs o
    LEFT JOIN code_redemptions cr ON cr.org_id = o.id
    LEFT JOIN premium_codes pc ON pc.id = cr.code_id
    ORDER BY o.created_at DESC
  `;

  const { rows: codes } = await sql`
    SELECT pc.code, pc.label, pc.tier, pc.active, pc.created_at,
           COUNT(cr.id) as redemption_count
    FROM premium_codes pc
    LEFT JOIN code_redemptions cr ON cr.code_id = pc.id
    GROUP BY pc.id
    ORDER BY pc.created_at DESC
  `;

  return {
    props: {
      orgs: orgs.map((r) => ({
        ...r,
        created_at: r.created_at?.toISOString() || null,
        redeemed_at: r.redeemed_at?.toISOString() || null,
        newsletter_opt_in: Boolean(r.newsletter_opt_in),
      })),
      codes: codes.map((r) => ({
        ...r,
        created_at: r.created_at?.toISOString() || null,
        redemption_count: Number(r.redemption_count),
        active: Boolean(r.active),
      })),
    },
  };
}

export default function AdminPage({ orgs, codes }) {
  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", padding: 40, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ color: '#1c3557', fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>
        District Mapper — Admin
      </h1>
      <p style={{ color: '#888', marginBottom: 40 }}>{orgs.length} organizations · {codes.length} codes</p>

      <h2 style={{ color: '#1c3557', marginBottom: 16 }}>Organizations</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 48, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f2f8ee' }}>
            {['Org', 'Person', 'Title', 'State', 'Email', 'Tier', 'Newsletter', 'Signed up', 'Code'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #a9dadc', color: '#1c3557' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map((o, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.org_name}</td>
              <td style={{ padding: '8px 12px' }}>{o.person_name}</td>
              <td style={{ padding: '8px 12px', color: '#666' }}>{o.title}</td>
              <td style={{ padding: '8px 12px' }}>{o.state}</td>
              <td style={{ padding: '8px 12px' }}>{o.email}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{
                  background: o.tier === 'pro' ? '#e63947' : o.tier === 'enterprise' ? '#1c3557' : '#eee',
                  color: o.tier === 'free' ? '#555' : '#fff',
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                }}>
                  {o.tier}
                </span>
              </td>
              <td style={{ padding: '8px 12px' }}>{o.newsletter_opt_in ? '✅' : '—'}</td>
              <td style={{ padding: '8px 12px', color: '#888' }}>{o.created_at?.slice(0, 10)}</td>
              <td style={{ padding: '8px 12px', color: '#888' }}>{o.code_label || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ color: '#1c3557', marginBottom: 16 }}>Premium Codes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f2f8ee' }}>
            {['Code', 'Label', 'Tier', 'Active', 'Redemptions', 'Created'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #a9dadc', color: '#1c3557' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
              <td style={{ padding: '8px 12px' }}>{c.label || '—'}</td>
              <td style={{ padding: '8px 12px' }}>{c.tier}</td>
              <td style={{ padding: '8px 12px' }}>{c.active ? '✅' : '❌'}</td>
              <td style={{ padding: '8px 12px' }}>{c.redemption_count}</td>
              <td style={{ padding: '8px 12px', color: '#888' }}>{c.created_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
