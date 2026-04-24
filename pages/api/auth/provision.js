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

  const { personName, orgName, title, state, newsletterOptIn } = req.body;
  if (!personName || !orgName || !title || !state) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    // Get email from Clerk
    const client = clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    // Insert org — idempotent
    await sql`
      INSERT INTO orgs (clerk_user_id, person_name, org_name, title, state, email, newsletter_opt_in)
      VALUES (${userId}, ${personName}, ${orgName}, ${title}, ${state}, ${email}, ${newsletterOptIn ?? false})
      ON CONFLICT (clerk_user_id) DO NOTHING
    `;

    // Send welcome email — fire and forget, don't fail provision if email fails
    sendWelcomeEmail({ personName, orgName, email, newsletterOptIn }).catch(() => {});

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function sendWelcomeEmail({ personName, orgName, email, newsletterOptIn }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

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
    : `<p>If you'd ever like tips on maps, data, and nonprofit strategy, you can subscribe to <a href="https://north-arrow.org/making-space">Making Space</a>, our monthly memo.</p>`;

  await transporter.sendMail({
    from: `District Mapper <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to District Mapper, ${personName}`,
    html: `
      <p>Hi ${personName},</p>
      <p>Welcome to District Mapper — you're all set.</p>
      <p>Your account for <strong>${orgName}</strong> is ready. Upload your constituent or program data and start mapping your people to legislative districts in minutes.</p>
      <p><a href="https://district-mapper.vercel.app" style="background:#e63947;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin:8px 0">Open District Mapper →</a></p>
      ${newsletterLine}
      <p>If you ever need help or have feedback, just reply to this email.</p>
      <p>— The North Arrow team</p>
    `,
  });
}
