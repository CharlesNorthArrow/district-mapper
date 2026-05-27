// Compatibility shim for browsers still running the pre-2026-05-27 client bundle.
// The save flow moved to direct browser → Vercel Blob uploads (see
// /api/auth/save-dataset-token), so this endpoint no longer accepts dataset
// bodies. Returning 410 Gone with an actionable message lets the old client
// surface "Please reload the page to continue saving" instead of an opaque
// "Save failed (404): unknown error". Safe to delete after old tabs have aged out.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'Please reload the page to continue saving — the app was updated.',
  });
}
