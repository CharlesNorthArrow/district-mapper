// GET /api/boundaries?layer=congressional
// GET /api/boundaries?layer=state-senate&stateFips=17
// GET /api/boundaries?layer=zcta&stateFips=17   (byBbox mode — uses state bounding box)
// Fetches boundary GeoJSON from ArcGIS Living Atlas or TIGERweb depending on layer config.
// Returns GeoJSON FeatureCollection.

import { LAYER_CONFIG } from '../../lib/layerConfig';
import { STATE_FIPS } from '../../lib/stateFips';
import { STATE_BBOX } from '../../lib/geoSuggest';

// Build FIPS → bbox lookup once at module load
const FIPS_TO_BBOX = Object.fromEntries(
  Object.entries(STATE_FIPS)
    .map(([name, fips]) => [fips, STATE_BBOX[name]])
    .filter(([, bbox]) => bbox != null)
);

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

  if ((config.queryMode === 'byState' || config.queryMode === 'byBbox') && !stateFips) {
    return res.status(400).json({ error: `layer ${layer} requires stateFips param` });
  }

  // Build WHERE clause
  let where;
  if (config.queryMode === 'national') {
    where = `${config.districtField} IS NOT NULL`;
    if (config.whereExtra) where += ` AND (${config.whereExtra})`;
  } else if (config.queryMode === 'byBbox') {
    where = '1=1';
  } else {
    // byState — stateField is either STATE (TIGERweb) or STATEFP (Living Atlas)
    where = `${config.stateField}='${stateFips}'`;
    if (config.whereExtra) where += ` AND (${config.whereExtra})`;
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

  // byBbox: filter by state bounding box using ArcGIS spatial query
  if (config.queryMode === 'byBbox') {
    const bbox = FIPS_TO_BBOX[stateFips];
    if (!bbox) return res.status(400).json({ error: `No bounding box found for FIPS ${stateFips}` });
    params.set('geometry', bbox.join(','));
    params.set('geometryType', 'esriGeometryEnvelope');
    params.set('inSR', '4326');
    params.set('spatialRel', 'esriSpatialRelIntersects');
  }

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
