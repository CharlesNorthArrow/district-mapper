// POST /api/admin/migrate-policy-cache
// One-time migration: creates the policy_cache table.
// Idempotent — safe to re-run. Admin-only.
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).end();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.emailAddresses[0]?.emailAddress !== process.env.ADMIN_EMAIL) {
    return res.status(403).end();
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS policy_cache (
        cache_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_policy_cache_created_at ON policy_cache(created_at)`;
    return res.status(200).json({ ok: true, table: 'policy_cache' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
