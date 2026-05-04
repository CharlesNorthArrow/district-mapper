// POST /api/billing/webhook
// Receives Stripe events and keeps orgs table in sync.
// CRITICAL: bodyParser must be disabled so Stripe can verify the raw body signature.
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { resolveTier } from '../../../lib/resolveTier';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const buf = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log('Unhandled Stripe event:', event.type);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Handler failed' });
  }
}

async function handleSubscriptionChange(sub) {
  const orgId = sub.metadata?.org_id;
  if (!orgId) {
    console.warn('Subscription missing org_id metadata:', sub.id);
    return;
  }

  // Write billing fields first so resolveTier sees up-to-date state
  await sql`
    UPDATE orgs SET
      stripe_subscription_id = ${sub.id},
      subscription_status = ${sub.status},
      subscription_price_id = ${sub.items.data[0]?.price?.id ?? null},
      current_period_end = to_timestamp(${sub.current_period_end}),
      cancel_at_period_end = ${sub.cancel_at_period_end}
    WHERE id = ${orgId}
  `;

  // Recompute tier and write the denormalized cache
  const { rows } = await sql`SELECT * FROM orgs WHERE id = ${orgId} LIMIT 1`;
  if (!rows.length) return;
  const tier = await resolveTier(rows[0]);
  await sql`UPDATE orgs SET tier = ${tier} WHERE id = ${orgId}`;
}

async function handleSubscriptionDeleted(sub) {
  const orgId = sub.metadata?.org_id;
  if (!orgId) return;

  await sql`
    UPDATE orgs SET
      subscription_status = 'canceled',
      cancel_at_period_end = false
    WHERE id = ${orgId}
  `;

  // resolveTier will return 'free' unless they have an active premium code
  const { rows } = await sql`SELECT * FROM orgs WHERE id = ${orgId} LIMIT 1`;
  if (!rows.length) return;
  const tier = await resolveTier(rows[0]);
  await sql`UPDATE orgs SET tier = ${tier} WHERE id = ${orgId}`;
}

async function handleCheckoutCompleted(session) {
  const orgId = session.client_reference_id;
  if (!orgId) return;
  sendWelcomeProEmail(orgId).catch(err => console.error('Welcome Pro email failed:', err));
}

async function handlePaymentFailed(invoice) {
  // Stripe retries automatically (Smart Retries). Log for ops visibility only.
  // Tier downgrade happens later via subscription.updated with status=past_due.
  console.warn('Payment failed for Stripe customer:', invoice.customer);
}

async function sendWelcomeProEmail(orgId) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const { rows } = await sql`SELECT person_name, email FROM orgs WHERE id = ${orgId} LIMIT 1`;
  if (!rows.length) return;
  const { person_name, email } = rows[0];
  const firstName = person_name.split(' ')[0];

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `District Mapper <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You're now on District Mapper Pro`,
    html: `
      <p>Hi ${firstName},</p>
      <p>Your District Mapper account is now on <strong>Pro</strong>. You have full access to all layers, AI analysis, PDF export, and Policy Pulse.</p>
      <p><a href="https://districts.north-arrow.org" style="background:#e63947;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin:8px 0">Open District Mapper →</a></p>
      <p>To manage your subscription, update your card, or cancel, use the billing portal inside the app.</p>
      <p>— The North Arrow team</p>
    `,
  });
}
