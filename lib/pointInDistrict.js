import * as turf from '@turf/turf';
import { LAYER_CONFIG } from './layerConfig';
import { CITY_COUNCIL_REGISTRY } from './cityCouncilRegistry';
import { FIPS_TO_ABBR } from './stateFips';

// Assigns district names to each point for each active layer.
// Returns enriched points: each gets a key per layerId with the matched district name or null.
// Points with no match in any layer get unmatched: true.
export function assignDistricts(points, layerGeojson) {
  return points.map((point) => {
    const enriched = { ...point };
    let matchedAny = false;

    for (const [layerId, geojson] of Object.entries(layerGeojson)) {
      if (!geojson?.features?.length) {
        enriched[layerId] = null;
        continue;
      }
      const turfPoint = turf.point([point.lng, point.lat]);
      let matched = null;

      const config = LAYER_CONFIG[layerId];
      const citySlug = layerId.startsWith('council-') ? layerId.slice('council-'.length) : null;
      const cityConfig = citySlug ? CITY_COUNCIL_REGISTRY[citySlug] : null;
      const field = config?.districtField ?? cityConfig?.districtField;
      const stateField = config?.stateField ?? null;

      for (const feature of geojson.features) {
        try {
          if (turf.booleanPointInPolygon(turfPoint, feature)) {
            const rawName = field
              ? (feature.properties[field] ?? feature.properties.NAME ?? feature.properties.name ?? 'Unknown')
              : (feature.properties.NAME ?? feature.properties.name ?? feature.properties.NAMELSAD ?? 'Unknown');
            // Qualify with state abbreviation for layers that span multiple states
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

    enriched.unmatched = Object.keys(layerGeojson).length > 0 && !matchedAny;
    return enriched;
  });
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
