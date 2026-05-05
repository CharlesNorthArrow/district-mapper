// POST /api/admin/delete-user?email=xxx
// Removes a user from orgs, datasets, code_redemptions, and Clerk. Admin-only.
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

  try {
    // Find org row
    const { rows } = await sql`SELECT id, clerk_user_id FROM orgs WHERE email = ${targetEmail} LIMIT 1`;
    const org = rows[0];

    if (org) {
      // Delete child rows first to satisfy FK constraints
      await sql`DELETE FROM datasets WHERE org_id = ${org.id}`;
      await sql`DELETE FROM code_redemptions WHERE org_id = ${org.id}`;
      await sql`DELETE FROM orgs WHERE id = ${org.id}`;
    }

    // Delete from Clerk (look up by email in case clerk_user_id is missing)
    const clerkUserId = org?.clerk_user_id;
    let deletedFromClerk = false;
    if (clerkUserId) {
      try {
        await client.users.deleteUser(clerkUserId);
        deletedFromClerk = true;
      } catch {
        // Fall back to email lookup
      }
    }
    if (!deletedFromClerk) {
      const clerkUsers = await client.users.getUserList({ emailAddress: [targetEmail] });
      const clerkUser = clerkUsers.data?.[0];
      if (clerkUser) {
        await client.users.deleteUser(clerkUser.id);
        deletedFromClerk = true;
      }
    }

    return res.json({
      ok: true,
      deletedFromDb: !!org,
      deletedFromClerk,
      email: targetEmail,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
