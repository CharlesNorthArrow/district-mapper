// GET /api/auth/load-dataset
// Returns the org's saved dataset, fetching the blob server-side to avoid CDN cache issues.
export const config = { api: { maxDuration: 30 } };

import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { rows } = await sql`
      SELECT d.blob_url, d.filename, d.uploaded_at
      FROM datasets d
      JOIN orgs o ON o.id = d.org_id
      WHERE o.clerk_user_id = ${userId}
    `;

    if (!rows.length) return res.status(200).json({ dataset: null });

    const { blob_url, filename, uploaded_at } = rows[0];

    // Proxy the blob through the server so the client never fetches it directly.
    // Direct client-side fetches can hit stale CDN cache when we overwrite the same
    // blob path (addRandomSuffix: false). Fetching server-side bypasses the CDN.
    const blobRes = await fetch(blob_url, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'Cache-Control': 'no-cache, no-store',
      },
    });

    if (!blobRes.ok) {
      console.error(`[load-dataset] blob fetch failed: ${blobRes.status} for ${blob_url}`);
      return res.status(200).json({ dataset: null });
    }

    const data = await blobRes.json();

    // v2 format: multiple batches
    if (data?.version === 2 && Array.isArray(data.batches)) {
      const total = data.batches.reduce((s, b) => s + (b.points?.length ?? 0), 0);
      console.log(`[load-dataset] returning v2 (${data.batches.length} batches, ${total} points) for user ${userId}`);
      return res.status(200).json({ dataset: { version: 2, batches: data.batches, filename, uploaded_at } });
    }

    // v1 format: single dataset
    if (!data?.points?.length) {
      console.error('[load-dataset] blob had no points');
      return res.status(200).json({ dataset: null });
    }

    console.log(`[load-dataset] returning v1 ${data.points.length} points for user ${userId}`);
    return res.status(200).json({
      dataset: {
        filename,
        uploaded_at,
        points: data.points,
        originalRows: data.originalRows ?? null,
        headers: data.headers ?? [],
        title: data.title ?? filename ?? '',
      },
    });
  } catch (err) {
    console.error('[load-dataset] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
