// POST /api/geocode
// Body: { addresses: string[] }
// Returns: [{ address, lat, lng, confidence }]
// Batches in groups of 50 and proxies to Mapbox Geocoding API.

import { getAuth } from '@clerk/nextjs/server';

const BATCH_SIZE = 50;

const MAPBOX_QUERY_MAX_LEN = 256;

async function geocodeOne(address) {
  const trimmed = String(address || '').trim();
  if (!trimmed) {
    return { address, lat: null, lng: null, confidence: 0 };
  }
  const query = trimmed.length > MAPBOX_QUERY_MAX_LEN ? trimmed.slice(0, MAPBOX_QUERY_MAX_LEN) : trimmed;
  const encoded = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${process.env.MAPBOX_TOKEN}&limit=1&country=US`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[geocode] Mapbox ${res.status} for "${query}": ${body.slice(0, 200)}`);
      return { address, lat: null, lng: null, confidence: 0 };
    }
    const data = await res.json();
    const feature = data.features?.[0];
    if (feature) {
      return {
        address,
        lng: feature.center[0],
        lat: feature.center[1],
        confidence: feature.relevance,
      };
    }
    return { address, lat: null, lng: null, confidence: 0 };
  } catch (err) {
    console.warn(`[geocode] fetch failed for "${query}": ${err.message}`);
    return { address, lat: null, lng: null, confidence: 0 };
  }
}

async function geocodeBatch(addresses) {
  const results = [];
  for (const address of addresses) {
    results.push(await geocodeOne(address));
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { addresses } = req.body;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return res.status(400).json({ error: 'addresses must be a non-empty array' });
  }

  try {
    const allResults = [];
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const batchResults = await geocodeBatch(batch);
      allResults.push(...batchResults);
    }
    return res.status(200).json(allResults);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
