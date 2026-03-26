// Chunks addresses into batches of 50 and calls /api/geocode sequentially.
// onProgress(pct) is called with 0–100 after each batch completes.

const BATCH_SIZE = 50;

export async function geocodeAddresses(addresses, onProgress) {
  const results = [];
  const total = addresses.length;
  let completed = 0;

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: batch }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Geocoding failed: ${res.statusText}`);
    }
    const batchResults = await res.json();
    results.push(...batchResults);
    completed += batch.length;
    if (onProgress) {
      onProgress(Math.round((completed / total) * 100));
    }
  }

  return results;
}
