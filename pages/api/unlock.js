export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;

  if (!process.env.LIMIT_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'LIMIT_PASSWORD is not configured' });
  }

  if (password === process.env.LIMIT_PASSWORD) {
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: false });
}
