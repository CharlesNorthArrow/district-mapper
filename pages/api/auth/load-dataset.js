// GET /api/auth/load-dataset
// Returns the org's saved dataset blob URL for client-side reload on login.
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { rows } = await sql`
      SELECT d.blob_url, d.filename, d.row_count, d.headers, d.uploaded_at
      FROM datasets d
      JOIN orgs o ON o.id = d.org_id
      WHERE o.clerk_user_id = ${userId}
    `;

    if (!rows.length) return res.status(200).json({ dataset: null });

    return res.status(200).json({ dataset: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
