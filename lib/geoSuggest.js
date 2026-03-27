// Suggests relevant boundary layers based on uploaded point locations.
// Uses bounding-box detection — fast, no API calls, accurate enough for surfacing suggestions.
// Returns { states: ['Illinois', 'Wisconsin'], cities: ['chicago', 'milwaukee'] }

// Approximate bounding boxes [west, south, east, north] for US states + DC
const STATE_BBOX = {
  'Alabama':              [-88.47, 30.14, -84.89, 35.01],
  'Alaska':               [-179.15, 51.21, -129.98, 71.39],
  'Arizona':              [-114.82, 31.33, -109.05, 37.00],
  'Arkansas':             [-94.62, 33.00, -89.64, 36.50],
  'California':           [-124.41, 32.53, -114.13, 42.01],
  'Colorado':             [-109.05, 36.99, -102.04, 41.00],
  'Connecticut':          [-73.73, 40.98, -71.79, 42.05],
  'Delaware':             [-75.79, 38.45, -74.98, 39.84],
  'District of Columbia': [-77.12, 38.79, -76.91, 38.99],
  'Florida':              [-87.63, 24.52, -79.97, 31.00],
  'Georgia':              [-85.61, 30.36, -80.84, 35.00],
  'Hawaii':               [-160.25, 18.91, -154.81, 22.24],
  'Idaho':                [-117.24, 41.99, -111.04, 49.00],
  'Illinois':             [-91.51, 36.97, -87.49, 42.51],
  'Indiana':              [-88.10, 37.77, -84.78, 41.76],
  'Iowa':                 [-96.64, 40.38, -90.14, 43.50],
  'Kansas':               [-102.05, 36.99, -94.59, 40.00],
  'Kentucky':             [-89.57, 36.50, -81.96, 39.15],
  'Louisiana':            [-94.04, 28.93, -88.82, 33.02],
  'Maine':                [-71.08, 42.98, -66.95, 47.46],
  'Maryland':             [-79.49, 37.91, -74.98, 39.72],
  'Massachusetts':        [-73.51, 41.24, -69.93, 42.89],
  'Michigan':             [-90.42, 41.70, -82.41, 48.26],
  'Minnesota':            [-97.24, 43.50, -89.49, 49.38],
  'Mississippi':          [-91.65, 30.17, -88.10, 35.01],
  'Missouri':             [-95.77, 35.99, -89.10, 40.61],
  'Montana':              [-116.05, 44.36, -104.04, 49.00],
  'Nebraska':             [-104.05, 39.99, -95.31, 43.00],
  'Nevada':               [-120.00, 35.00, -114.03, 42.00],
  'New Hampshire':        [-72.56, 42.70, -70.70, 45.31],
  'New Jersey':           [-75.56, 38.93, -73.89, 41.36],
  'New Mexico':           [-109.05, 31.33, -103.00, 37.00],
  'New York':             [-79.76, 40.50, -71.86, 45.01],
  'North Carolina':       [-84.32, 33.84, -75.46, 36.59],
  'North Dakota':         [-104.05, 45.94, -96.55, 49.00],
  'Ohio':                 [-84.82, 38.40, -80.52, 42.32],
  'Oklahoma':             [-103.00, 33.62, -94.43, 37.00],
  'Oregon':               [-124.57, 41.99, -116.46, 46.24],
  'Pennsylvania':         [-80.52, 39.72, -74.69, 42.27],
  'Rhode Island':         [-71.91, 41.15, -71.12, 42.02],
  'South Carolina':       [-83.35, 32.05, -78.54, 35.22],
  'South Dakota':         [-104.06, 42.48, -96.44, 45.94],
  'Tennessee':            [-90.31, 34.98, -81.65, 36.68],
  'Texas':                [-106.65, 25.84, -93.51, 36.50],
  'Utah':                 [-114.05, 36.99, -109.04, 42.00],
  'Vermont':              [-73.43, 42.73, -71.50, 45.02],
  'Virginia':             [-83.68, 36.54, -75.24, 39.47],
  'Washington':           [-124.73, 45.54, -116.92, 49.00],
  'West Virginia':        [-82.64, 37.20, -77.72, 40.64],
  'Wisconsin':            [-92.89, 42.49, -86.76, 47.08],
  'Wyoming':              [-111.06, 40.99, -104.05, 45.01],
};

// Approximate bounding boxes for Tier 1 cities used in city detection
// (independent of whether arcgisEndpoint is configured in the registry)
const CITY_BBOX = {
  'nyc':           [-74.26, 40.48, -73.70, 40.92],
  'la':            [-118.67, 33.70, -118.16, 34.34],
  'chicago':       [-87.94, 41.64, -87.52, 42.02],
  'houston':       [-95.79, 29.52, -95.01, 30.11],
  'phoenix':       [-112.32, 33.29, -111.93, 33.82],
  'philadelphia':  [-75.28, 39.87, -74.96, 40.14],
  'san-antonio':   [-98.80, 29.27, -98.31, 29.62],
  'san-diego':     [-117.30, 32.53, -116.91, 32.97],
  'dallas':        [-97.00, 32.62, -96.55, 33.02],
  'seattle':       [-122.44, 47.49, -122.23, 47.74],
  'portland':      [-122.84, 45.43, -122.47, 45.66],
  'denver':        [-105.11, 39.61, -104.60, 39.91],
  'boston':        [-71.19, 42.23, -70.99, 42.40],
  'atlanta':       [-84.55, 33.64, -84.29, 33.89],
  'dc':            [-77.12, 38.79, -76.91, 38.99],
};

function inBbox(lng, lat, bbox) {
  const [w, s, e, n] = bbox;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

export function suggestGeographies(points) {
  const stateCounts = {};
  const cityHits = new Set();

  for (const { lng, lat } of points) {
    if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) continue;

    // State detection
    for (const [state, bbox] of Object.entries(STATE_BBOX)) {
      if (inBbox(lng, lat, bbox)) {
        stateCounts[state] = (stateCounts[state] || 0) + 1;
        break; // one state per point
      }
    }

    // City detection
    for (const [slug, bbox] of Object.entries(CITY_BBOX)) {
      if (inBbox(lng, lat, bbox)) {
        cityHits.add(slug);
      }
    }
  }

  // Sort states by point count descending
  const states = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([state]) => state);

  return { states, cities: [...cityHits] };
}
