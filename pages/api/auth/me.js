// GET /api/auth/me
// Returns org profile + tier. Returns { tier: 'free', loggedIn: false } if not logged in.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(200).json({ tier: 'free', loggedIn: false });
  }

  try {
    const { rows } = await sql`
      SELECT id, person_name, org_name, title, state, email, tier
      FROM orgs
      WHERE clerk_user_id = ${userId}
    `;

    if (!rows.length) {
      return res.status(200).json({ tier: 'free', loggedIn: true, needsOnboarding: true });
    }

    const org = rows[0];
    return res.status(200).json({
      loggedIn: true,
      orgId: org.id,
      personName: org.person_name,
      orgName: org.org_name,
      title: org.title,
      state: org.state,
      email: org.email,
      tier: org.tier,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
