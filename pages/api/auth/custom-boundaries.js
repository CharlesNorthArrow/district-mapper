// GET /api/auth/custom-boundaries
// Returns { boundaries: [{ id, layer_id, display_name, name_field, blob_url,
// feature_count, unique_names_count, uploaded_at }] } for the authenticated
// org. Metadata only — GeoJSON payloads are fetched client-side from blob_url
// on demand when the user toggles a boundary on.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

async function getOrgId(userId) {
  const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
  return rows[0]?.id ?? null;
}

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const orgId = await getOrgId(userId);
    if (!orgId) return res.status(404).json({ error: 'Org not found' });

    const { rows } = await sql`
      SELECT id, layer_id, display_name, name_field, blob_url,
             feature_count, unique_names_count, uploaded_at
      FROM custom_boundaries
      WHERE org_id = ${orgId}
      ORDER BY uploaded_at DESC
    `;
    return res.status(200).json({ boundaries: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
