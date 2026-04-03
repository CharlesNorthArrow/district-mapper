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

  // Request both the district name field and state field (needed for choropleth + lookup highlights)
  const outFields = [config.districtField, config.stateField].filter(Boolean).join(',');

  const params = new URLSearchParams({
    f: 'geojson',
    where,
    outFields,
    returnGeometry: 'true',
    outSR: '4326',
    maxAllowableOffset: String(config.maxAllowableOffset),
    resultRecordCount: String(config.resultRecordCount),
  });

  // byState paginated — for layers with potentially thousands of features per state
  if (config.queryMode === 'byState' && config.paginated) {
    const PAGE_SIZE = 2000;
    const allFeatures = [];
    try {
      for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
        params.set('resultRecordCount', String(PAGE_SIZE));
        params.set('resultOffset', String(offset));
        const upstream = await fetch(`${config.endpoint}/query?${params}`, {
          signal: AbortSignal.timeout(45000),
        });
        const text = await upstream.text();
        let page;
        try { page = JSON.parse(text); } catch {
          return res.status(502).json({
            error: `Data source returned non-JSON (status ${upstream.status}).`,
          });
        }
        if (page.error) return res.status(502).json({ error: page.error.message || 'Query error from data source' });
        const features = page.features || [];
        allFeatures.push(...features);
        if (features.length < PAGE_SIZE) break;
      }
    } catch (err) {
      return res.status(502).json({ error: `Failed to reach data source: ${err.message}` });
    }
    return res.status(200).json({ type: 'FeatureCollection', features: allFeatures });
  }

  // byBbox: paginate through all results and post-filter to centroid within state bbox.
  // Needed for ZCTA because the layer has no state FIPS field — a plain bbox intersects
  // query pulls ZCTAs from neighboring states and the 2000-record cap creates holes.
  if (config.queryMode === 'byBbox') {
    const bbox = FIPS_TO_BBOX[stateFips];
    if (!bbox) return res.status(400).json({ error: `No bounding box found for FIPS ${stateFips}` });
    const [minLng, minLat, maxLng, maxLat] = bbox;

    params.set('geometry', bbox.join(','));
    params.set('geometryType', 'esriGeometryEnvelope');
    params.set('inSR', '4326');
    params.set('spatialRel', 'esriSpatialRelIntersects');

    const PAGE_SIZE = 1000;
    const allFeatures = [];

    try {
      for (let offset = 0; offset < 20000; offset += PAGE_SIZE) {
        params.set('resultRecordCount', String(PAGE_SIZE));
        params.set('resultOffset', String(offset));

        const upstream = await fetch(`${config.endpoint}/query?${params}`, {
          signal: AbortSignal.timeout(45000),
        });
        const text = await upstream.text();
        let page;
        try { page = JSON.parse(text); } catch {
          return res.status(502).json({
            error: `Data source returned non-JSON (status ${upstream.status}).`,
          });
        }
        if (page.error) return res.status(502).json({ error: page.error.message || 'Query error from data source' });

        const features = page.features || [];
        allFeatures.push(...features);
        if (features.length < PAGE_SIZE) break; // last page
      }
    } catch (err) {
      return res.status(502).json({ error: `Failed to reach data source: ${err.message}` });
    }

    // Post-filter: keep features whose bbox centroid falls within the state bbox.
    // This removes ZCTAs from neighboring states that intersect the bbox rectangle.
    function featureCentroid(f) {
      let sumLng = 0, sumLat = 0, n = 0;
      function walk(c) {
        if (!Array.isArray(c)) return;
        if (typeof c[0] === 'number') { sumLng += c[0]; sumLat += c[1]; n++; }
        else c.forEach(walk);
      }
      walk(f.geometry?.coordinates);
      return n > 0 ? [sumLng / n, sumLat / n] : null;
    }

    const filtered = allFeatures.filter((f) => {
      const [cLng, cLat] = featureCentroid(f) || [];
      if (cLng == null) return false;
      return cLng >= minLng && cLng <= maxLng && cLat >= minLat && cLat <= maxLat;
    });

    return res.status(200).json({ type: 'FeatureCollection', features: filtered });
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
