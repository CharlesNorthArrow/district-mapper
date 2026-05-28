// GET  /api/auth/starred-layers           — { starredLayers: string[] }
// PUT  /api/auth/starred-layers
//   body: { starredLayers: string[], merge?: boolean }
// Persists the authenticated org's starred geography picks. PUT with
// merge=true unions the request set with the stored set — used on sign-in
// so any stars the user added while anonymous are not lost.
//
// Layer IDs follow the existing keys (LAYER_CONFIG keys plus 'council-<slug>'
// extras). The server stores them as an opaque JSON array — validation lives
// on the client where the layer catalog is.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

async function getOrgId(userId) {
  const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
  return rows[0]?.id ?? null;
}

function sanitize(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || id.length > 64 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const orgId = await getOrgId(userId);
    if (!orgId) return res.status(404).json({ error: 'Org not found' });

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT starred_layers FROM orgs WHERE id = ${orgId}`;
      return res.status(200).json({ starredLayers: rows[0]?.starred_layers ?? [] });
    }

    if (req.method === 'PUT') {
      const incoming = sanitize(req.body?.starredLayers);
      const merge = req.body?.merge === true;

      let next = incoming;
      if (merge) {
        const { rows } = await sql`SELECT starred_layers FROM orgs WHERE id = ${orgId}`;
        const existing = sanitize(rows[0]?.starred_layers);
        const union = new Set([...existing, ...incoming]);
        next = [...union];
      }

      await sql`
        UPDATE orgs
        SET starred_layers = ${JSON.stringify(next)}::jsonb
        WHERE id = ${orgId}
      `;
      return res.status(200).json({ starredLayers: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
