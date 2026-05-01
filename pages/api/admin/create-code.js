import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).end();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.emailAddresses[0]?.emailAddress !== process.env.ADMIN_EMAIL) {
    return res.status(403).end();
  }

  const { code, label, tier } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code is required' });
  if (!['pro', 'enterprise'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

  try {
    await sql`
      INSERT INTO premium_codes (code, label, tier, active)
      VALUES (${code.trim().toUpperCase()}, ${label?.trim() || null}, ${tier}, TRUE)
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.message?.includes('unique')) return res.status(400).json({ error: 'Code already exists' });
    return res.status(500).json({ error: err.message });
  }
}
