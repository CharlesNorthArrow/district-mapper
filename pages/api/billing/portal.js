// POST /api/billing/portal
// Creates a Stripe Customer Portal session and returns the hosted URL.
// The portal lets users update card, cancel, switch plans, and view invoices.
import Stripe from 'stripe';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { rows } = await sql`
      SELECT stripe_customer_id FROM orgs WHERE clerk_user_id = ${userId} LIMIT 1
    `;
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No billing account yet — subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    res.status(500).json({ error: err.message });
  }
}
