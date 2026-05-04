// POST /api/billing/create-checkout-session
// Body: { plan: 'monthly' | 'annual' }
// Creates a Stripe Checkout Session and returns the hosted URL.
import Stripe from 'stripe';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { plan } = req.body;
  const priceId = plan === 'annual'
    ? process.env.STRIPE_PRICE_PRO_ANNUAL
    : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) return res.status(500).json({ error: 'Price ID not configured' });

  try {
    const { rows } = await sql`
      SELECT id, stripe_customer_id, email FROM orgs
      WHERE clerk_user_id = ${userId} LIMIT 1
    `;
    const org = rows[0];
    if (!org) return res.status(404).json({ error: 'Org not found' });

    // Reuse existing Stripe customer, or create one
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.email,
        metadata: { org_id: org.id },
      });
      customerId = customer.id;
      await sql`UPDATE orgs SET stripe_customer_id = ${customerId} WHERE id = ${org.id}`;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgrade=canceled`,
      allow_promotion_codes: true,
      client_reference_id: org.id,
      subscription_data: {
        metadata: { org_id: org.id },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    res.status(500).json({ error: err.message });
  }
}
