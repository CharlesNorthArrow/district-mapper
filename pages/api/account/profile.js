// POST /api/account/profile
// Updates the signed-in org's profile fields.
// Currently handles org_description.
// [EXPAND] Next iteration: also accept constituency_area on the same endpoint.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { orgDescription } = req.body || {};
  if (typeof orgDescription !== 'string') {
    return res.status(400).json({ error: 'orgDescription required' });
  }
  const value = orgDescription.trim();

  try {
    const { rowCount } = await sql`
      UPDATE orgs SET org_description = ${value || null}
      WHERE clerk_user_id = ${userId}
    `;
    if (rowCount === 0) return res.status(404).json({ error: 'org not found' });
    return res.status(200).json({ ok: true, orgDescription: value });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
