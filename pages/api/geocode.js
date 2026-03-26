// POST /api/geocode
// Body: { addresses: string[] }
// Returns: [{ address, lat, lng, confidence }]
// Batches in groups of 50 and proxies to Mapbox Geocoding API.

const BATCH_SIZE = 50;

async function geocodeBatch(addresses) {
  const results = [];
  for (const address of addresses) {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${process.env.MAPBOX_TOKEN}&limit=1&country=US`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Mapbox API error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const feature = data.features?.[0];
    if (feature) {
      results.push({
        address,
        lng: feature.center[0],
        lat: feature.center[1],
        confidence: feature.relevance,
      });
    } else {
      results.push({ address, lat: null, lng: null, confidence: 0 });
    }
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
