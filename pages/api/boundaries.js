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

  const geometry = JSON.stringify({
    xmin: west, ymin: south, xmax: east, ymax: north,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    f: 'geojson',
    geometryType: 'esriGeometryEnvelope',
    geometry,
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
    where: '1=1',
  });

  const url = `${config.endpoint}/${config.layerId}/query?${params}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(502).json({
        error: `TIGERweb returned ${upstream.status}: ${upstream.statusText}`,
      });
    }
    const geojson = await upstream.json();
    if (geojson.error) {
      return res.status(502).json({ error: geojson.error.message || 'TIGERweb error' });
    }
    return res.status(200).json(geojson);
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach TIGERweb: ${err.message}` });
  }
}
