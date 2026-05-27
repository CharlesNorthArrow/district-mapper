// POST /api/auth/save-dataset-token
// Signs short-lived client tokens for direct browser → Vercel Blob uploads,
// and writes the datasets metadata row to Postgres when the upload completes.
// This pattern bypasses Vercel's 4.5 MB request body cap on Functions:
// the dataset JSON never flows through this route — only the SDK's token-exchange
// and the post-upload callback do, both of which are tiny.
import { handleUpload } from '@vercel/blob/client';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  let orgId;
  try {
    const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
    if (!rows.length) return res.status(404).json({ error: 'Org not found' });
    orgId = rows[0].id;
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const expectedPathname = `datasets/${orgId}/latest.json`;

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (pathname !== expectedPathname) {
          throw new Error('Invalid upload path for this user');
        }
        let summary = {};
        try { summary = clientPayload ? JSON.parse(clientPayload) : {}; } catch {}
        return {
          allowedContentTypes: ['application/json'],
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({
            orgId,
            rowCount: Number(summary.rowCount) || 0,
            primaryTitle: typeof summary.primaryTitle === 'string' ? summary.primaryTitle : '',
            primaryHeaders: Array.isArray(summary.primaryHeaders) ? summary.primaryHeaders : [],
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { orgId, rowCount, primaryTitle, primaryHeaders } = JSON.parse(tokenPayload);
        await sql`
          INSERT INTO datasets (org_id, blob_url, filename, row_count, headers)
          VALUES (${orgId}, ${blob.url}, ${primaryTitle}, ${rowCount}, ${JSON.stringify(primaryHeaders)})
          ON CONFLICT (org_id)
          DO UPDATE SET
            blob_url = EXCLUDED.blob_url,
            filename = EXCLUDED.filename,
            row_count = EXCLUDED.row_count,
            headers = EXCLUDED.headers,
            uploaded_at = now()
        `;
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    // Vercel Blob retries the callback up to 5 times until it sees a 2xx
    return res.status(400).json({ error: err.message });
  }
}
