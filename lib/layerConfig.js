// TIGERweb ArcGIS REST base URL
const BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';

// Layer IDs should be verified against live service:
// GET {BASE}/{service}/MapServer?f=json
// The layer IDs below are based on typical TIGERweb structure and may need adjustment.
export const LAYER_CONFIG = {
  congressional: {
    displayName: 'US Congressional Districts',
    endpoint: `${BASE}/Legislative/MapServer`,
    layerId: 12,
    districtField: 'NAMELSAD',
  },
  'us-senate': {
    displayName: 'US Senate (States)',
    endpoint: `${BASE}/State_Leg/MapServer`,
    layerId: 0,
    districtField: 'NAME',
  },
  'state-senate': {
    displayName: 'State Senate Districts',
    endpoint: `${BASE}/State_Leg/MapServer`,
    layerId: 2,
    districtField: 'NAMELSAD',
  },
  'state-house': {
    displayName: 'State House Districts',
    endpoint: `${BASE}/State_Leg/MapServer`,
    layerId: 4,
    districtField: 'NAMELSAD',
  },
  'school-unified': {
    displayName: 'Unified School Districts',
    endpoint: `${BASE}/Education/MapServer`,
    layerId: 0,
    districtField: 'NAME',
  },
  'school-elementary': {
    displayName: 'Elementary School Districts',
    endpoint: `${BASE}/Education/MapServer`,
    layerId: 1,
    districtField: 'NAME',
  },
  'school-secondary': {
    displayName: 'Secondary School Districts',
    endpoint: `${BASE}/Education/MapServer`,
    layerId: 2,
    districtField: 'NAME',
  },
};
