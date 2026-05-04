// DELETE /api/admin/delete-user?email=xxx
// Removes a user from both the orgs table and Clerk. Admin-only.
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).end();

  const client = await clerkClient();
  const requestingUser = await client.users.getUser(userId);
  const email = requestingUser.emailAddresses?.[0]?.emailAddress;
  if (email !== process.env.ADMIN_EMAIL) return res.status(403).end();

  const targetEmail = req.query.email?.trim().toLowerCase();
  if (!targetEmail) return res.status(400).json({ error: 'email query param required' });

  // Find org row
  const { rows } = await sql`SELECT * FROM orgs WHERE email = ${targetEmail} LIMIT 1`;
  const org = rows[0];

  // Delete from orgs
  if (org) {
    await sql`DELETE FROM orgs WHERE email = ${targetEmail}`;
  }

  // Find and delete from Clerk
  const clerkUsers = await client.users.getUserList({ emailAddress: [targetEmail] });
  const clerkUser = clerkUsers.data?.[0];
  if (clerkUser) {
    await client.users.deleteUser(clerkUser.id);
  }

  return res.json({
    ok: true,
    deletedFromDb: !!org,
    deletedFromClerk: !!clerkUser,
    email: targetEmail,
  });
}
