// POST /api/admin/migrate-org-profile
// One-time migration: adds org_description and constituency_area columns to orgs.
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
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS org_description TEXT`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS constituency_area TEXT`;
    return res.status(200).json({ ok: true, columns: ['org_description', 'constituency_area'] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
