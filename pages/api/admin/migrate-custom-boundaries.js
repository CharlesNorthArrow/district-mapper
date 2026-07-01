// POST /api/admin/migrate-custom-boundaries
// One-time migration: creates the custom_boundaries table.
// Stores per-org uploaded GeoJSON boundary metadata (blob URL, name field,
// feature count) so custom boundaries persist across sessions.
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
      CREATE TABLE IF NOT EXISTS custom_boundaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        layer_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        name_field TEXT NOT NULL,
        blob_url TEXT NOT NULL,
        feature_count INT NOT NULL,
        unique_names_count INT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(org_id, layer_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_boundaries_org ON custom_boundaries(org_id)`;
    return res.status(200).json({ ok: true, table: 'custom_boundaries' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
