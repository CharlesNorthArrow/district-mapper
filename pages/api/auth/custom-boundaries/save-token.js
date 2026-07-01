// POST /api/auth/custom-boundaries/save-token
// Signs a short-lived client token for direct browser → Vercel Blob upload
// of a custom boundary GeoJSON, and inserts the metadata row when the upload
// completes. Same pattern as save-dataset-token: the GeoJSON never flows
// through this route, only the token exchange and post-upload callback do.
// Enforces the per-tier custom-boundary cap in onBeforeGenerateToken.
import { handleUpload } from '@vercel/blob/client';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { resolveTier } from '../../../../lib/resolveTier';
import { getCustomBoundaryLimit } from '../../../../lib/tierConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  let orgId;
  let tier;
  try {
    const { rows } = await sql`SELECT * FROM orgs WHERE clerk_user_id = ${userId}`;
    if (!rows.length) return res.status(404).json({ error: 'Org not found' });
    orgId = rows[0].id;
    tier = await resolveTier(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Path must be under this org's namespace and be a UUID.json
        const expectedPrefix = `custom-boundaries/${orgId}/`;
        if (!pathname.startsWith(expectedPrefix) || !pathname.endsWith('.json')) {
          throw new Error('Invalid upload path for this user');
        }

        // Enforce the tier cap by counting existing rows
        const limit = getCustomBoundaryLimit(tier);
        if (limit !== Infinity) {
          const { rows: countRows } = await sql`
            SELECT COUNT(*)::int AS n FROM custom_boundaries WHERE org_id = ${orgId}
          `;
          if ((countRows[0]?.n ?? 0) >= limit) {
            throw new Error(`Custom-boundary limit reached (${limit}). Upgrade to Pro for unlimited boundaries.`);
          }
        }

        let summary = {};
        try { summary = clientPayload ? JSON.parse(clientPayload) : {}; } catch {}

        return {
          allowedContentTypes: ['application/json'],
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            orgId,
            layerId: typeof summary.layerId === 'string' ? summary.layerId : '',
            displayName: typeof summary.displayName === 'string' ? summary.displayName : 'Untitled',
            nameField: typeof summary.nameField === 'string' ? summary.nameField : 'NAME',
            featureCount: Number(summary.featureCount) || 0,
            uniqueNamesCount: Number(summary.uniqueNamesCount) || 0,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { orgId, layerId, displayName, nameField, featureCount, uniqueNamesCount } = JSON.parse(tokenPayload);
        await sql`
          INSERT INTO custom_boundaries
            (org_id, layer_id, display_name, name_field, blob_url, feature_count, unique_names_count)
          VALUES
            (${orgId}, ${layerId}, ${displayName}, ${nameField}, ${blob.url}, ${featureCount}, ${uniqueNamesCount})
          ON CONFLICT (org_id, layer_id)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            name_field = EXCLUDED.name_field,
            blob_url = EXCLUDED.blob_url,
            feature_count = EXCLUDED.feature_count,
            unique_names_count = EXCLUDED.unique_names_count,
            uploaded_at = now()
        `;
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
