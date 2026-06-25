// POST /api/account/profile
// Updates the signed-in org's profile fields: org_description and
// constituency_area. Both are required (empty string is allowed and stored as NULL).
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { orgDescription, constituencyArea } = req.body || {};
  if (typeof orgDescription !== 'string' || typeof constituencyArea !== 'string') {
    return res.status(400).json({ error: 'orgDescription and constituencyArea required' });
  }
  const desc = orgDescription.trim();
  const area = constituencyArea.trim();

  try {
    const { rowCount } = await sql`
      UPDATE orgs SET
        org_description   = ${desc || null},
        constituency_area = ${area || null}
      WHERE clerk_user_id = ${userId}
    `;
    if (rowCount === 0) return res.status(404).json({ error: 'org not found' });
    return res.status(200).json({ ok: true, orgDescription: desc, constituencyArea: area });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
