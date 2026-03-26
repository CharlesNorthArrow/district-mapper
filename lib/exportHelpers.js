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
