// GET /api/district-lookup?lat=41.8781&lng=-87.6298
// Queries every layer in LAYER_CONFIG with a point-intersects spatial filter.
// Returns { layerId: districtName } for all layers that return a match.
// National layers (congressional, us-senate) are queried first in parallel.
// State FIPS is extracted from the us-senate result, then state layers follow.

import { LAYER_CONFIG } from '../../lib/layerConfig';

const NATIONAL_LAYER_IDS = ['congressional', 'us-senate'];
const STATE_LAYER_IDS = ['state-senate', 'state-house', 'school-unified', 'school-elementary', 'school-secondary'];

async function queryPoint(layerId, config, geometry, stateFips = null) {
  const params = new URLSearchParams({
    f: 'json',
    geometry,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'false',
    inSR: '4326',
    outFields: layerId === 'us-senate'
      ? `${config.districtField},GEOID`   // GEOID = 2-digit state FIPS
      : config.districtField,
  });

  // Build WHERE clause
  const whereParts = [];
  if (config.queryMode === 'byState' && stateFips) {
    whereParts.push(`${config.stateField}='${stateFips}'`);
  }
  if (config.whereExtra) {
    whereParts.push(`(${config.whereExtra})`);
  }
  if (whereParts.length > 0) {
    params.set('where', whereParts.join(' AND '));
  }

  try {
    const res = await fetch(`${config.endpoint}/query?${params}`, {
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    const attrs = data.features?.[0]?.attributes;
    if (!attrs) return { layerId, districtName: null, geoid: null };
    return {
      layerId,
      districtName: attrs[config.districtField] ?? null,
      geoid: attrs.GEOID ?? null,
    };
  } catch {
    return { layerId, districtName: null, geoid: null };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng } = req.query;
  if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
    return res.status(400).json({ error: 'lat and lng params required' });
  }

  const geometry = `${parseFloat(lng)},${parseFloat(lat)}`;

  // Wave 1: national layers in parallel
  const nationalResults = await Promise.all(
    NATIONAL_LAYER_IDS.map((id) => queryPoint(id, LAYER_CONFIG[id], geometry))
  );

  // Extract state FIPS from the us-senate (states) result
  const usSenateResult = nationalResults.find((r) => r.layerId === 'us-senate');
  const stateFips = usSenateResult?.geoid ?? null;

  // Wave 2: state layers in parallel (skip if no state found)
  const stateResults = stateFips
    ? await Promise.all(
        STATE_LAYER_IDS.map((id) => queryPoint(id, LAYER_CONFIG[id], geometry, stateFips))
      )
    : STATE_LAYER_IDS.map((id) => ({ layerId: id, districtName: null }));

  // Build ordered result — preserve LAYER_CONFIG key order
  const ordered = {};
  for (const { layerId, districtName } of [...nationalResults, ...stateResults]) {
    if (districtName) ordered[layerId] = districtName;
  }

  return res.status(200).json(ordered);
}
