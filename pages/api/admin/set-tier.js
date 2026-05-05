import { getAuth, clerkClient } from '@clerk/nextjs/server';
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

  const { email, tier } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  if (!['free', 'pro', 'enterprise'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

  try {
    const result = await sql`UPDATE orgs SET tier = ${tier} WHERE email = ${email.trim().toLowerCase()}`;
    if (result.rowCount === 0) return res.status(404).json({ error: 'Org not found' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
