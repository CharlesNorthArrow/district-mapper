// GET /api/auth/load-dataset
// Streams the org's saved dataset JSON straight from Vercel Blob to the browser.
// Streaming (Transfer-Encoding: chunked) is required because Vercel Functions
// cap buffered response bodies at 4.5 MB — datasets larger than that would
// otherwise fail to load. Metadata (filename, uploaded_at) is sent in response
// headers since it lives in Postgres, not the blob.
export const config = { api: { maxDuration: 60 } };

import { Readable } from 'node:stream';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { get } from '@vercel/blob';

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { rows } = await sql`
      SELECT o.id AS org_id, d.filename, d.uploaded_at
      FROM orgs o
      LEFT JOIN datasets d ON d.org_id = o.id
      WHERE o.clerk_user_id = ${userId}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Org not found' });
    const { org_id, filename, uploaded_at } = rows[0];

    // No dataset row yet — return empty body the client treats as "no saved dataset"
    if (!filename && !uploaded_at) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('x-dataset-empty', '1');
      return res.status(200).end('null');
    }

    const result = await get(`datasets/${org_id}/latest.json`, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      res.setHeader('x-dataset-empty', '1');
      return res.status(200).json(null);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'private, no-store');
    if (filename) res.setHeader('x-dataset-filename', encodeURIComponent(filename));
    if (uploaded_at) res.setHeader('x-dataset-uploaded-at', new Date(uploaded_at).toISOString());

    Readable.fromWeb(result.stream).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
