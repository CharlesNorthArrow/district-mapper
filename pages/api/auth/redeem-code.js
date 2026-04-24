// POST /api/auth/redeem-code
// Body: { code }
// Validates multi-use premium code, upgrades org tier.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code required' });

  try {
    const { rows: orgRows } = await sql`
      SELECT id, tier FROM orgs WHERE clerk_user_id = ${userId}
    `;
    if (!orgRows.length) return res.status(404).json({ error: 'Org not found' });
    const org = orgRows[0];

    if (org.tier === 'pro' || org.tier === 'enterprise') {
      return res.status(200).json({ ok: true, tier: org.tier, alreadyUpgraded: true });
    }

    const { rows: codeRows } = await sql`
      SELECT id, tier, active FROM premium_codes
      WHERE code = ${code.trim().toUpperCase()} AND active = TRUE
    `;
    if (!codeRows.length) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }
    const premiumCode = codeRows[0];

    const { rows: existing } = await sql`
      SELECT id FROM code_redemptions WHERE org_id = ${org.id}
    `;
    if (existing.length) {
      return res.status(400).json({ error: 'Your organization has already redeemed a code.' });
    }

    await sql`UPDATE orgs SET tier = ${premiumCode.tier} WHERE id = ${org.id}`;
    await sql`INSERT INTO code_redemptions (code_id, org_id) VALUES (${premiumCode.id}, ${org.id})`;

    return res.status(200).json({ ok: true, tier: premiumCode.tier });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
