// DELETE /api/auth/custom-boundaries/[id]
// Removes a custom boundary: deletes the Postgres metadata row and the Vercel
// Blob object it points to. Auth-scoped to the caller's org — trying to delete
// another org's row returns 404.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { del } from '@vercel/blob';

async function getOrgId(userId) {
  const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
  return rows[0]?.id ?? null;
}

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  try {
    const orgId = await getOrgId(userId);
    if (!orgId) return res.status(404).json({ error: 'Org not found' });

    const { rows } = await sql`
      SELECT blob_url FROM custom_boundaries WHERE id = ${id} AND org_id = ${orgId}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Boundary not found' });

    // Best-effort blob delete — never block the row delete on it
    try {
      await del(rows[0].blob_url);
    } catch (blobErr) {
      console.warn(`[custom-boundaries] blob delete failed for ${rows[0].blob_url}: ${blobErr.message}`);
    }

    await sql`DELETE FROM custom_boundaries WHERE id = ${id} AND org_id = ${orgId}`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
