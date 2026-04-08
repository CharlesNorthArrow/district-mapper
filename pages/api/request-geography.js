function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, area, boundaryType, description } = req.body || {};
  if (!name || !email || !area || !boundaryType || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const internalHtml = `
    <p>A new geography request has been submitted via District Mapper.</p>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Name</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Email</td><td>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Geographical Area</td><td>${escapeHtml(area)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Boundary Type</td><td>${escapeHtml(boundaryType)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Submitted</td><td>${escapeHtml(submittedAt)} CT</td></tr>
    </table>
    <p style="margin-top:16px"><strong>Description:</strong></p>
    <p style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px">${escapeHtml(description).replace(/\n/g, '<br>')}</p>
  `;

  const confirmationHtml = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thanks for reaching out! We've received your request for the following geography:</p>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin:12px 0">
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Geographical Area</td><td>${escapeHtml(area)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;font-weight:bold">Boundary Type</td><td>${escapeHtml(boundaryType)}</td></tr>
    </table>
    <p>We'll review your request and be in touch within <strong>5 business days</strong>.</p>
    <p>— The North Arrow team</p>
  `;

  async function sendEmail(to, subject, html) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'District Mapper <noreply@north-arrow.org>',
        to,
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Resend error ${response.status}`);
    }
  }

  try {
    await sendEmail(
      process.env.INTERNAL_EMAIL || 'charles@north-arrow.org',
      `Geography Request: ${boundaryType} — ${area}`,
      internalHtml
    );
    await sendEmail(
      email,
      'Your geography request — North Arrow',
      confirmationHtml
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
