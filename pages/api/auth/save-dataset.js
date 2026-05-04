// POST /api/auth/save-dataset
// Body: JSON { points, originalRows, headers, title }
// Saves geocoded dataset to Vercel Blob + metadata to Postgres.
// Called after a successful upload for logged-in users.
export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

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

    const body = req.body;

    // Determine display info for the datasets metadata row
    let rowCount, primaryTitle, primaryHeaders;
    if (body.version === 2 && Array.isArray(body.batches)) {
      rowCount = body.batches.reduce((s, b) => s + (b.points?.length ?? 0), 0);
      primaryTitle = body.batches[0]?.title || '';
      primaryHeaders = body.batches[0]?.headers ?? [];
    } else {
      rowCount = body.points?.length ?? 0;
      primaryTitle = body.title || '';
      primaryHeaders = body.headers ?? [];
    }

    const content = JSON.stringify(body);

    const blob = await put(`datasets/${orgId}/latest.json`, content, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    await sql`
      INSERT INTO datasets (org_id, blob_url, filename, row_count, headers)
      VALUES (${orgId}, ${blob.url}, ${primaryTitle}, ${rowCount}, ${JSON.stringify(primaryHeaders)})
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
