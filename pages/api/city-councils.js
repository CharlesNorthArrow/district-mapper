// GET /api/city-councils?city=chicago&bbox=-87.9,41.6,-87.5,42.1
// Looks up city in registry, proxies city ArcGIS REST endpoint.
// Returns GeoJSON FeatureCollection.

import { CITY_COUNCIL_REGISTRY } from '../../lib/cityCouncilRegistry';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, bbox } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'city param required' });
  }

  const config = CITY_COUNCIL_REGISTRY[city];
  if (!config) {
    return res.status(404).json({ error: `City not in registry: ${city}` });
  }
  if (!config.arcgisEndpoint) {
    return res.status(503).json({
      error: `ArcGIS endpoint for ${config.name} has not been configured yet`,
    });
  }

  if (!bbox) {
    return res.status(400).json({ error: 'bbox param required' });
  }

  const [west, south, east, north] = bbox.split(',').map(Number);
  if ([west, south, east, north].some(isNaN)) {
    return res.status(400).json({ error: 'bbox must be comma-separated numbers: west,south,east,north' });
  }

  const params = new URLSearchParams({
    f: 'geojson',
    geometryType: 'esriGeometryEnvelope',
    geometry: `${west},${south},${east},${north}`,
    inSR: '4326',
    outSR: '4326',
    outFields: config.districtField,
    returnGeometry: 'true',
    where: 'OBJECTID IS NOT NULL',
    resultRecordCount: '500',
  });

  const url = `${config.arcgisEndpoint}/${config.layerId}/query?${params}`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await upstream.text();

    let geojson;
    try {
      geojson = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: `City ArcGIS returned non-JSON response (status ${upstream.status})` });
    }

    if (geojson.error) {
      return res.status(502).json({ error: geojson.error.message || 'ArcGIS error' });
    }
    return res.status(200).json(geojson);
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach city ArcGIS: ${err.message}` });
  }
}
