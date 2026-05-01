// POST /api/auth/provision
// Creates org row after onboarding form submit. Sends welcome email via nodemailer.
import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { personName, orgName, title, state, newsletterOptIn, inviteCode, requestedPlan } = req.body;
  if (!personName || !orgName || !title || !state) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    // Get email from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    // Resolve tier — validate invite code if provided
    let tier = 'free';
    let codeId = null;
    if (inviteCode?.trim()) {
      const { rows: codeRows } = await sql`
        SELECT id, tier FROM premium_codes
        WHERE code = ${inviteCode.trim().toUpperCase()} AND active = TRUE
      `;
      if (!codeRows.length) {
        return res.status(400).json({ error: 'Invalid or expired invite code.' });
      }
      tier = codeRows[0].tier;
      codeId = codeRows[0].id;
    }

    // Insert org — idempotent
    const { rows: orgRows } = await sql`
      INSERT INTO orgs (clerk_user_id, person_name, org_name, title, state, email, tier, newsletter_opt_in)
      VALUES (${userId}, ${personName}, ${orgName}, ${title}, ${state}, ${email}, ${tier}, ${newsletterOptIn ?? false})
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        person_name = EXCLUDED.person_name,
        org_name = EXCLUDED.org_name,
        title = EXCLUDED.title,
        state = EXCLUDED.state,
        email = EXCLUDED.email
      RETURNING id
    `;
    const orgId = orgRows[0].id;

    // Record code redemption if a code was used
    if (codeId) {
      await sql`
        INSERT INTO code_redemptions (code_id, org_id) VALUES (${codeId}, ${orgId})
        ON CONFLICT (org_id) DO NOTHING
      `;
    }

    // Send welcome email — fire and forget
    sendWelcomeEmail({ personName, orgName, email, newsletterOptIn, requestedPlan }).catch(() => {});

    return res.status(200).json({ ok: true, tier });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function sendWelcomeEmail({ personName, orgName, email, newsletterOptIn }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const firstName = personName.split(' ')[0];

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const newsletterLine = newsletterOptIn
    ? `<p>You're subscribed to <strong>Making Space</strong>, our monthly memo on maps, data, and nonprofit strategy. Look for the next issue in your inbox.</p>`
    : `<p>If you'd ever like tips on maps, data, and nonprofit strategy, you can subscribe to <a href="https://www.north-arrow.org/newsletter-signup">Making Space</a>, our monthly memo.</p>`;

  await transporter.sendMail({
    from: `District Mapper <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to District Mapper, ${firstName}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>Welcome to District Mapper — you're all set.</p>
      <p>Your account for <strong>${orgName}</strong> is ready. Upload your constituent or program data and start mapping your people to legislative districts in minutes.</p>
      <p><a href="https://districts.north-arrow.org" style="background:#e63947;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin:8px 0">Open District Mapper →</a></p>
      ${newsletterLine}
      <p style="color:#555;font-size:13px;">District Mapper is currently in beta. If you run into anything unexpected or have ideas for improvement, we'd genuinely love to hear from you — just reply to this email or write to <a href="mailto:charles@north-arrow.org">charles@north-arrow.org</a>.</p>
      <p>— The North Arrow team</p>
    `,
  });
}
