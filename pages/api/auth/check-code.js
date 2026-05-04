// GET /api/auth/check-code?code=XXX
// Public — no auth required. Validates a premium code before Clerk signup.
// Only reveals validity and tier, no org or user data.
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const code = req.query.code?.trim().toUpperCase();
  if (!code) return res.status(400).json({ valid: false, error: 'Code required.' });

  try {
    const { rows } = await sql`
      SELECT tier FROM premium_codes WHERE code = ${code} AND active = TRUE
    `;
    if (!rows.length) return res.json({ valid: false, error: 'Invalid or expired code.' });
    return res.json({ valid: true, tier: rows[0].tier });
  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Could not validate code.' });
  }
}
