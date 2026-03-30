// Canonical color for every known layer type.
// Chosen to be perceptually distinct at both fill (0.1 opacity) and line (0.8 opacity) on a light basemap.

export const LAYER_COLORS = {
  // National
  congressional:            '#e63947',  // red
  'us-senate':              '#1c3557',  // dark navy
  counties:                 '#467c9d',  // mid blue
  'tribal-lands':           '#78350f',  // earth brown
  'urban-areas':            '#0d9488',  // teal
  // State
  'incorporated-places':    '#d97706',  // amber
  zcta:                     '#0891b2',  // sky blue
  'state-senate':           '#3b82f6',  // blue
  'state-house':            '#22c55e',  // green
  'school-unified':         '#a855f7',  // purple
  'school-elementary':      '#f97316',  // orange
  'school-secondary':       '#06b6d4',  // cyan
  // City council — keyed by full layer ID (council-{slug})
  'council-nyc':            '#f59e0b',  // amber
  'council-nyc-nta':        '#b45309',  // amber dark
  'council-la':             '#db2777',  // pink
  'council-chicago':        '#7c3aed',  // violet
  'council-houston':        '#047857',  // forest green
  'council-phoenix':        '#0f766e',  // dark teal
  'council-philadelphia':   '#b91c1c',  // crimson
  'council-san-antonio':    '#1d4ed8',  // cobalt
  'council-san-diego':      '#be185d',  // raspberry
  'council-dallas':         '#15803d',  // dark green
  'council-seattle':        '#9333ea',  // deep purple
  'council-portland':       '#c2410c',  // brick
  'council-denver':         '#0369a1',  // ocean blue
  'council-boston':         '#7e22ce',  // dark violet
  'council-atlanta':        '#166534',  // dark emerald
  'council-dc':             '#92400e',  // brown
};

export const DEFAULT_LAYER_COLOR = '#467c9d';

// Cycled through in order for custom (uploaded) GeoJSON layers
export const CUSTOM_COLOR_POOL = [
  '#6a4c93', '#f43f5e', '#14b8a6', '#fbbf24', '#84cc16', '#60a5fa',
];
