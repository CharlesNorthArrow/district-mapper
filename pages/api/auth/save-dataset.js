// POST /api/auth/save-dataset
// Body: JSON { points, originalRows, headers, title }
// Saves geocoded dataset to Vercel Blob + metadata to Postgres.
// Called after a successful upload for logged-in users.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { rows: orgRows } = await sql`
      SELECT id FROM orgs WHERE clerk_user_id = ${userId}
    `;
    if (!orgRows.length) return res.status(404).json({ error: 'Org not found' });
    const orgId = orgRows[0].id;

    const { points, originalRows, headers, title } = req.body;
    const content = JSON.stringify({ points, originalRows, headers, title });

    const blob = await put(`datasets/${orgId}/latest.json`, content, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    await sql`
      INSERT INTO datasets (org_id, blob_url, filename, row_count, headers)
      VALUES (${orgId}, ${blob.url}, ${title || ''}, ${points?.length ?? 0}, ${JSON.stringify(headers ?? [])})
      ON CONFLICT (org_id)
      DO UPDATE SET
        blob_url = EXCLUDED.blob_url,
        filename = EXCLUDED.filename,
        row_count = EXCLUDED.row_count,
        headers = EXCLUDED.headers,
        uploaded_at = now()
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
