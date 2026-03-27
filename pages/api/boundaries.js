// GET /api/boundaries?layer=congressional
// GET /api/boundaries?layer=state-senate&stateFips=17
// Fetches boundary GeoJSON from ArcGIS Living Atlas or TIGERweb depending on layer config.
// Returns GeoJSON FeatureCollection.

import { LAYER_CONFIG } from '../../lib/layerConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { layer, stateFips } = req.query;

  if (!layer) {
    return res.status(400).json({ error: 'layer param required' });
  }

  const config = LAYER_CONFIG[layer];
  if (!config) {
    return res.status(404).json({ error: `Unknown layer: ${layer}` });
  }

  if (config.queryMode === 'byState' && !stateFips) {
    return res.status(400).json({ error: `layer ${layer} requires stateFips param` });
  }

  // Build WHERE clause
  let where;
  if (config.queryMode === 'national') {
    where = `${config.districtField} IS NOT NULL`;
    if (config.whereExtra) {
      where += ` AND (${config.whereExtra})`;
    }
  } else {
    // byState — stateField is either STATE (TIGERweb) or STATEFP (Living Atlas)
    where = `${config.stateField}='${stateFips}'`;
    if (config.whereExtra) {
      where += ` AND (${config.whereExtra})`;
    }
  }

  const params = new URLSearchParams({
    f: 'geojson',
    where,
    outFields: config.districtField,
    returnGeometry: 'true',
    outSR: '4326',
    maxAllowableOffset: String(config.maxAllowableOffset),
    resultRecordCount: String(config.resultRecordCount),
  });

  const url = `${config.endpoint}/query?${params}`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(45000) });
    const text = await upstream.text();

    let geojson;
    try {
      geojson = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: `Data source returned non-JSON (status ${upstream.status}). The service may be temporarily unavailable.`,
      });
    }

    if (geojson.error) {
      return res.status(502).json({ error: geojson.error.message || 'Query error from data source' });
    }

    return res.status(200).json(geojson);
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach data source: ${err.message}` });
  }
}
