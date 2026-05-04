// POST /api/admin/migrate-stripe
// One-time migration: adds Stripe billing columns to the orgs table.
// Idempotent — safe to re-run. Admin-only.
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

  try {
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS subscription_status TEXT`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS subscription_price_id TEXT`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ`;
    await sql`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE`;

    await sql`CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer ON orgs(stripe_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orgs_stripe_subscription ON orgs(stripe_subscription_id)`;

    return res.status(200).json({
      ok: true,
      columns: [
        'stripe_customer_id',
        'stripe_subscription_id',
        'subscription_status',
        'subscription_price_id',
        'current_period_end',
        'cancel_at_period_end',
      ],
      indexes: ['idx_orgs_stripe_customer', 'idx_orgs_stripe_subscription'],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
