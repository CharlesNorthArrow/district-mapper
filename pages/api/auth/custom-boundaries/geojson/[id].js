// GET /api/auth/custom-boundaries/geojson/[id]
// Streams the GeoJSON payload for a custom boundary from private Vercel Blob
// storage through this endpoint, so signed-in members of the org can render
// the boundary on the map. Boundaries were uploaded with access: 'private',
// so the blob URL isn't directly fetchable from the browser — same pattern
// as load-dataset.js.
export const config = { api: { maxDuration: 60 } };

import { Readable } from 'node:stream';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { get } from '@vercel/blob';

async function getOrgId(userId) {
  const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
  return rows[0]?.id ?? null;
}

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  try {
    const orgId = await getOrgId(userId);
    if (!orgId) return res.status(404).json({ error: 'Org not found' });

    const { rows } = await sql`
      SELECT blob_url, layer_id FROM custom_boundaries
      WHERE id = ${id} AND org_id = ${orgId}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Boundary not found' });

    const { blob_url, layer_id } = rows[0];
    // Derive the path from the layer_id — layer_id is 'custom-<uuid>' and the
    // stored blob path is 'custom-boundaries/<orgId>/<uuid>.json'.
    const uuid = layer_id.startsWith('custom-') ? layer_id.slice('custom-'.length) : layer_id;
    const path = `custom-boundaries/${orgId}/${uuid}.json`;

    const result = await get(path, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      return res.status(404).json({ error: 'Blob missing' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'private, no-store');
    Readable.fromWeb(result.stream).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
