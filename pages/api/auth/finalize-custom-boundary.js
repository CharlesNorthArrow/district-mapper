// POST /api/auth/finalize-custom-boundary
// Body: { blob_url, layer_id, display_name, name_field, feature_count, unique_names_count }
// Inserts the metadata row for a custom boundary AFTER the client has completed
// the direct-to-Blob PUT. Client-driven finalization is used instead of Vercel
// Blob's onUploadCompleted webhook because that callback path gets intercepted
// at the Vercel edge (returns 404 with cache=HIT) — the SDK webhook is
// unreliable behind edge middleware / deployment protection.
//
// Enforces the tier cap here (same as the token endpoint) so a client can't
// bypass the limit by not fetching a token.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { resolveTier } from '../../../lib/resolveTier';
import { getCustomBoundaryLimit } from '../../../lib/tierConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const {
    blob_url,
    layer_id,
    display_name,
    name_field,
    feature_count,
    unique_names_count,
  } = req.body || {};

  if (!blob_url || !layer_id || !display_name || !name_field) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows: orgRows } = await sql`SELECT * FROM orgs WHERE clerk_user_id = ${userId}`;
    if (!orgRows.length) return res.status(404).json({ error: 'Org not found' });
    const orgId = orgRows[0].id;
    const tier = await resolveTier(orgRows[0]);

    const limit = getCustomBoundaryLimit(tier);
    if (limit !== Infinity) {
      const { rows: existingRows } = await sql`
        SELECT COUNT(*)::int AS n FROM custom_boundaries
        WHERE org_id = ${orgId} AND layer_id != ${layer_id}
      `;
      if ((existingRows[0]?.n ?? 0) >= limit) {
        return res.status(403).json({ error: `Custom-boundary limit reached (${limit}). Upgrade to Pro for unlimited boundaries.` });
      }
    }

    const featureCount = Number(feature_count) || 0;
    const uniqueNamesCount = Number(unique_names_count) || 0;

    const { rows } = await sql`
      INSERT INTO custom_boundaries
        (org_id, layer_id, display_name, name_field, blob_url, feature_count, unique_names_count)
      VALUES
        (${orgId}, ${layer_id}, ${display_name}, ${name_field}, ${blob_url}, ${featureCount}, ${uniqueNamesCount})
      ON CONFLICT (org_id, layer_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        name_field = EXCLUDED.name_field,
        blob_url = EXCLUDED.blob_url,
        feature_count = EXCLUDED.feature_count,
        unique_names_count = EXCLUDED.unique_names_count,
        uploaded_at = now()
      RETURNING id, layer_id, display_name, name_field, blob_url,
                feature_count, unique_names_count, uploaded_at
    `;
    return res.status(200).json({ boundary: rows[0] });
  } catch (err) {
    console.error(`[custom-boundaries] finalize failed: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
