import Papa from 'papaparse';

// Merges district assignment columns back into the original CSV rows.
// enrichedPoints must be in the same order as originalRows.
export function buildEnrichedCSV(originalRows, enrichedPoints, activeLayerIds) {
  const merged = originalRows.map((row, i) => {
    const point = enrichedPoints[i];
    const extra = {};
    for (const layerId of activeLayerIds) {
      extra[`district_${layerId}`] = point?.[layerId] ?? '';
    }
    return { ...row, ...extra };
  });
  return Papa.unparse(merged);
}

// Builds a CSV containing only rows whose district assignment in layerId
// matches one of the names in the districtNames Set.
export function buildFilteredCSV(originalRows, enrichedPoints, layerId, districtNames, activeLayerIds) {
  const indices = enrichedPoints.reduce((acc, p, i) => {
    if (districtNames.has(p[layerId])) acc.push(i);
    return acc;
  }, []);
  const filteredRows = indices.map((i) => originalRows[i]);
  const filteredPoints = indices.map((i) => enrichedPoints[i]);
  return buildEnrichedCSV(filteredRows, filteredPoints, activeLayerIds);
}

// Triggers a CSV download in the browser.
export function downloadCSV(csvString, filename = 'district-mapper-export.csv') {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
