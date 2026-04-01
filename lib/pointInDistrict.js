import * as turf from '@turf/turf';
import { LAYER_CONFIG } from './layerConfig';
import { CITY_COUNCIL_REGISTRY } from './cityCouncilRegistry';
import { FIPS_TO_ABBR } from './stateFips';

// Assigns district names to each point for each active layer.
// Returns enriched points: each gets a key per layerId with the matched district name or null.
// Points with no match in any layer get unmatched: true.
// Async: processes in chunks of 1000 to keep the browser responsive on large datasets.
// onProgress(done, total) is called after each chunk.
export async function assignDistricts(points, layerGeojson, onProgress) {
  const CHUNK_SIZE = 1000;
  const result = [];

  // Pre-compute per-layer config and feature bboxes — done once, not per point
  const layerEntries = Object.entries(layerGeojson).map(([layerId, geojson]) => {
    const config = LAYER_CONFIG[layerId];
    const citySlug = layerId.startsWith('council-') ? layerId.slice('council-'.length) : null;
    const cityConfig = citySlug ? CITY_COUNCIL_REGISTRY[citySlug] : null;
    const field = config?.districtField ?? cityConfig?.districtField;
    const stateField = config?.stateField ?? null;
    const featuresWithBbox = (geojson?.features || []).map((f) => ({
      feature: f,
      bbox: turf.bbox(f), // [minLng, minLat, maxLng, maxLat]
    }));
    return { layerId, featuresWithBbox, field, stateField };
  });

  for (let i = 0; i < points.length; i += CHUNK_SIZE) {
    const chunk = points.slice(i, i + CHUNK_SIZE);

    for (const point of chunk) {
      const enriched = { ...point };
      let matchedAny = false;
      const turfPoint = turf.point([point.lng, point.lat]); // created once per point

      for (const { layerId, featuresWithBbox, field, stateField } of layerEntries) {
        if (!featuresWithBbox.length) { enriched[layerId] = null; continue; }
        let matched = null;

        for (const { feature, bbox } of featuresWithBbox) {
          // Bbox pre-filter — skip expensive polygon test if point is obviously outside
          if (point.lng < bbox[0] || point.lng > bbox[2] ||
              point.lat < bbox[1] || point.lat > bbox[3]) continue;
          try {
            if (turf.booleanPointInPolygon(turfPoint, feature)) {
              const rawName = field
                ? (feature.properties[field] ?? feature.properties.NAME ?? feature.properties.name ?? 'Unknown')
                : (feature.properties.NAME ?? feature.properties.name ?? feature.properties.NAMELSAD ?? 'Unknown');
              if (stateField) {
                const fips = String(feature.properties[stateField]).padStart(2, '0');
                const abbr = FIPS_TO_ABBR[fips];
                matched = abbr ? `${abbr} – ${rawName}` : rawName;
              } else {
                matched = rawName;
              }
              matchedAny = true;
              break;
            }
          } catch {
            // Malformed geometry — skip this feature
          }
        }
        enriched[layerId] = matched;
      }

      enriched.unmatched = layerEntries.length > 0 && !matchedAny;
      result.push(enriched);
    }

    onProgress?.(Math.min(i + CHUNK_SIZE, points.length), points.length);
    await new Promise((r) => setTimeout(r, 0)); // yield to browser between chunks
  }

  return result;
}

// Summarizes point-in-district results for the AnalysisPanel pivot table.
// Returns { [layerId]: [{ districtName, count, pct, fieldAverages }] }
export function summarizeByLayer(enrichedPoints, layerIds, numericFields) {
  const summary = {};

  for (const layerId of layerIds) {
    const counts = {};
    const fieldSums = {};
    const fieldCounts = {};

    for (const point of enrichedPoints) {
      const district = point[layerId];
      if (district == null) continue; // unmatched points shown separately in AnalysisPanel
      counts[district] = (counts[district] || 0) + 1;

      for (const field of numericFields) {
        const val = parseFloat(point[field]);
        if (!isNaN(val)) {
          fieldSums[district] = fieldSums[district] || {};
          fieldCounts[district] = fieldCounts[district] || {};
          fieldSums[district][field] = (fieldSums[district][field] || 0) + val;
          fieldCounts[district][field] = (fieldCounts[district][field] || 0) + 1;
        }
      }
    }

    const total = enrichedPoints.length;
    summary[layerId] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([districtName, count]) => {
        const fieldAverages = {};
        for (const field of numericFields) {
          if (fieldSums[districtName]?.[field] !== undefined) {
            fieldAverages[field] = fieldSums[districtName][field] / fieldCounts[districtName][field];
          }
        }
        return { districtName, count, pct: ((count / total) * 100).toFixed(1), fieldAverages };
      });
  }

  return summary;
}
