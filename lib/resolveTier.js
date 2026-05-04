// Server-side tier resolution. Source of truth is the DB, not localStorage.
// Call this in /api/auth/me and in the Stripe webhook handler.
// orgs.tier is kept as a denormalized cache — write to it from the webhook,
// but always compute authoritatively here for /api/auth/me responses.
import { sql } from '@vercel/postgres';

export async function resolveTier(org) {
  // 1. Active premium code redemption — takes priority, can grant 'enterprise'
  const { rows: codeRows } = await sql`
    SELECT pc.tier FROM code_redemptions cr
    JOIN premium_codes pc ON cr.code_id = pc.id
    WHERE cr.org_id = ${org.id} AND pc.active = TRUE
    LIMIT 1
  `;
  if (codeRows.length) return codeRows[0].tier;

  // 2. Active Stripe subscription
  if (['active', 'trialing'].includes(org.subscription_status)) return 'pro';

  // 3. Canceled but still within the paid period
  if (
    org.subscription_status === 'canceled' &&
    org.current_period_end &&
    new Date(org.current_period_end) > new Date()
  ) {
    return 'pro';
  }

  // 4. Past-due — 7-day grace period while Stripe retries the card
  if (
    org.subscription_status === 'past_due' &&
    org.current_period_end &&
    daysSince(org.current_period_end) < 7
  ) {
    return 'pro';
  }

  return 'free';
}

function daysSince(timestamp) {
  const ms = Date.now() - new Date(timestamp).getTime();
  return ms / (1000 * 60 * 60 * 24);
}
