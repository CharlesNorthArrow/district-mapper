// GET /api/boundaries?layer=congressional&bbox=-87.9,41.6,-87.5,42.1
// Proxies TIGERweb ArcGIS REST requests to avoid CORS.
// Returns GeoJSON FeatureCollection.

import { LAYER_CONFIG } from '../../lib/layerConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { layer, bbox } = req.query;

  if (!layer) {
    return res.status(400).json({ error: 'layer param required' });
  }
  if (!bbox) {
    return res.status(400).json({ error: 'bbox param required' });
  }

  const config = LAYER_CONFIG[layer];
  if (!config) {
    return res.status(404).json({ error: `Unknown layer: ${layer}` });
  }

  const [west, south, east, north] = bbox.split(',').map(Number);
  if ([west, south, east, north].some(isNaN)) {
    return res.status(400).json({ error: 'bbox must be comma-separated numbers: west,south,east,north' });
  }

  // TIGERweb accepts the envelope as a simple comma-separated string, not a JSON object
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

  const url = `${config.endpoint}/${config.layerId}/query?${params}`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await upstream.text();

    let geojson;
    try {
      geojson = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: `TIGERweb returned non-JSON response (status ${upstream.status})` });
    }

    if (geojson.error) {
      return res.status(502).json({ error: geojson.error.message || 'TIGERweb query error' });
    }
    return res.status(200).json(geojson);
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach TIGERweb: ${err.message}` });
  }
}
