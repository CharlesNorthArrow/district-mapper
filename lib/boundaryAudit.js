// Validates a parsed GeoJSON custom-boundary file and scores each property
// as a candidate name field. Pure and synchronous — no network calls.
//
// Returns:
// {
//   ok: boolean,                  // false if there are any fatal errors
//   errors: string[],             // fatal (block upload)
//   warnings: string[],           // non-fatal (still allow upload)
//   featureCount: number,
//   geometryTypes: string[],      // sorted unique
//   candidateNameFields: [
//     { property, unique, coverage, type, score, sample }
//   ],
//   recommendedField: string | null
// }

const ALLOWED_GEOMETRY_TYPES = new Set(['Polygon', 'MultiPolygon']);
const PREFERRED_NAME_RE = /^(name|namelsad|namelsad10|namelsad20|district|ward|precinct|zone|label|title|region)/i;
const CRS_SANITY_ABS_MAX = 200;
const RECOMMENDATION_MIN_SCORE = 40;

function firstCoord(geometry) {
  if (!geometry) return null;
  const c = geometry.coordinates;
  if (!Array.isArray(c)) return null;
  // Drill down through nested arrays until we hit a [lng, lat] pair
  let ref = c;
  while (Array.isArray(ref) && Array.isArray(ref[0])) ref = ref[0];
  if (Array.isArray(ref) && typeof ref[0] === 'number' && typeof ref[1] === 'number') return ref;
  return null;
}

function looksProjected(features) {
  for (let i = 0; i < Math.min(5, features.length); i++) {
    const c = firstCoord(features[i]?.geometry);
    if (!c) continue;
    if (Math.abs(c[0]) > CRS_SANITY_ABS_MAX || Math.abs(c[1]) > CRS_SANITY_ABS_MAX) return true;
  }
  return false;
}

function collectProperties(features) {
  // Property → { values: [], nonNullCount, types: Set }
  const props = {};
  for (const f of features) {
    const p = f?.properties || {};
    for (const key of Object.keys(p)) {
      if (!props[key]) props[key] = { values: [], nonNullCount: 0, types: new Set() };
      const v = p[key];
      if (v === null || v === undefined || v === '') continue;
      props[key].nonNullCount += 1;
      props[key].values.push(v);
      props[key].types.add(typeof v);
    }
  }
  return props;
}

function scoreProperty(property, info, featureCount) {
  const uniqueSet = new Set(info.values.map(String));
  const unique = uniqueSet.size;
  const coverage = featureCount === 0 ? 0 : info.nonNullCount / featureCount;

  const isNumericOnly = info.types.size === 1 && info.types.has('number');
  const isStringOnly = info.types.size === 1 && info.types.has('string');
  const type = isNumericOnly ? 'number' : isStringOnly ? 'string' : 'mixed';

  let score = 0;
  if (PREFERRED_NAME_RE.test(property)) score += 40;
  score += 30 * coverage;
  score += 20 * Math.min(1, unique / Math.max(1, featureCount));
  if (type === 'number') score -= 20;
  if (unique === 1) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const sample = [];
  const seen = new Set();
  for (const v of info.values) {
    const s = String(v);
    if (seen.has(s)) continue;
    seen.add(s);
    sample.push(s);
    if (sample.length >= 3) break;
  }

  return { property, unique, coverage: Math.round(coverage * 100) / 100, type, score, sample };
}

export function auditBoundary(geojson) {
  const errors = [];
  const warnings = [];

  if (!geojson || typeof geojson !== 'object') {
    return {
      ok: false, errors: ['File is not valid JSON.'], warnings: [],
      featureCount: 0, geometryTypes: [], candidateNameFields: [], recommendedField: null,
    };
  }

  if (geojson.type !== 'FeatureCollection') {
    errors.push(`Expected a GeoJSON FeatureCollection (got "${geojson.type || 'unknown'}").`);
  }

  const features = Array.isArray(geojson.features) ? geojson.features : [];
  const featureCount = features.length;
  if (featureCount === 0) {
    errors.push('File contains no features.');
  }

  const geometryTypesSet = new Set();
  let badGeomCount = 0;
  for (const f of features) {
    const t = f?.geometry?.type;
    if (!t) { badGeomCount++; continue; }
    geometryTypesSet.add(t);
    if (!ALLOWED_GEOMETRY_TYPES.has(t)) badGeomCount++;
  }
  const geometryTypes = [...geometryTypesSet].sort();

  if (badGeomCount > 0 && featureCount > 0) {
    if (badGeomCount === featureCount) {
      errors.push(`Boundary files must contain Polygon or MultiPolygon geometries (found ${geometryTypes.join(', ') || 'none'}).`);
    } else {
      warnings.push(`${badGeomCount} of ${featureCount} features are not Polygon/MultiPolygon and will be ignored.`);
    }
  }

  if (geometryTypes.length > 1 && geometryTypes.every((t) => ALLOWED_GEOMETRY_TYPES.has(t))) {
    warnings.push(`File mixes ${geometryTypes.join(' and ')} — will render but confirm this is intentional.`);
  }

  if (featureCount > 0 && looksProjected(features)) {
    warnings.push('Coordinates look projected (not WGS84 / lat-lng). Boundaries may render in the wrong place.');
  }

  const propsMap = collectProperties(features);
  const candidateNameFields = Object.entries(propsMap)
    .map(([key, info]) => scoreProperty(key, info, featureCount))
    .sort((a, b) => b.score - a.score);

  const recommendedField =
    candidateNameFields[0] && candidateNameFields[0].score >= RECOMMENDATION_MIN_SCORE
      ? candidateNameFields[0].property
      : null;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    featureCount,
    geometryTypes,
    candidateNameFields,
    recommendedField,
  };
}

// Count unique non-null values for a specific property across the FeatureCollection.
// Used to update the "unique names" summary when the user picks a different name field.
export function countUnique(geojson, property) {
  const set = new Set();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  for (const f of features) {
    const v = f?.properties?.[property];
    if (v === null || v === undefined || v === '') continue;
    set.add(String(v));
  }
  return set.size;
}
