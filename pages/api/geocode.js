// POST /api/geocode
// Body: { addresses: string[] }
// Returns: [{ address, lat, lng, confidence }]
// Uses Mapbox Geocoding v6 batch endpoint (50 queries per Mapbox call).

import { getAuth } from '@clerk/nextjs/server';

const MAPBOX_BATCH_MAX = 50;
const MAPBOX_QUERY_MAX_LEN = 256;
const CONFIDENCE_MAP = { exact: 1.0, high: 0.9, medium: 0.7, low: 0.5 };

function normalizeAddress(address) {
  const trimmed = String(address || '').trim();
  if (!trimmed) return null;
  return trimmed.length > MAPBOX_QUERY_MAX_LEN ? trimmed.slice(0, MAPBOX_QUERY_MAX_LEN) : trimmed;
}

async function geocodeBatch(addresses) {
  const results = addresses.map((address) => ({ address, lat: null, lng: null, confidence: 0 }));

  const queries = [];
  const positions = [];
  addresses.forEach((address, i) => {
    const q = normalizeAddress(address);
    if (q !== null) {
      queries.push({ q, country: 'us', limit: 1 });
      positions.push(i);
    }
  });

  if (queries.length === 0) return results;

  const url = `https://api.mapbox.com/search/geocode/v6/batch?access_token=${process.env.MAPBOX_TOKEN}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queries),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[geocode] Mapbox batch ${res.status}: ${body.slice(0, 300)}`);
      return results;
    }
    const data = await res.json();
    const batch = Array.isArray(data.batch) ? data.batch : [];
    batch.forEach((fc, i) => {
      const feature = fc?.features?.[0];
      if (!feature) return;
      const coords = feature.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;
      const [lng, lat] = coords;
      if (typeof lng !== 'number' || typeof lat !== 'number') return;
      const confStr = feature.properties?.match_code?.confidence;
      const confidence = CONFIDENCE_MAP[confStr] ?? 0.5;
      const originalIndex = positions[i];
      results[originalIndex] = {
        address: addresses[originalIndex],
        lat,
        lng,
        confidence,
      };
    });
    return results;
  } catch (err) {
    console.warn(`[geocode] batch fetch failed: ${err.message}`);
    return results;
  }
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
    for (let i = 0; i < addresses.length; i += MAPBOX_BATCH_MAX) {
      const chunk = addresses.slice(i, i + MAPBOX_BATCH_MAX);
      const chunkResults = await geocodeBatch(chunk);
      allResults.push(...chunkResults);
    }
    return res.status(200).json(allResults);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
