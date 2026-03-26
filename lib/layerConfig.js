// TIGERweb ArcGIS REST base URL
const BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';

// Layer IDs verified against live services on 2026-03-26:
//   Legislative/MapServer?f=json — layers 0 (119th Congressional), 1 (Upper/Senate), 2 (Lower/House)
//   School/MapServer?f=json     — layers 0 (Unified), 1 (Secondary), 2 (Elementary)
//   State_County/MapServer?f=json — layer 0 (States, current)
export const LAYER_CONFIG = {
  congressional: {
    displayName: 'US Congressional Districts',
    endpoint: `${BASE}/Legislative/MapServer`,
    layerId: 0, // 119th Congressional Districts
    districtField: 'NAMELSAD',
  },
  'us-senate': {
    displayName: 'US Senate (States)',
    endpoint: `${BASE}/State_County/MapServer`,
    layerId: 0, // State boundaries (senators represent whole states)
    districtField: 'NAME',
  },
  'state-senate': {
    displayName: 'State Senate Districts',
    endpoint: `${BASE}/Legislative/MapServer`,
    layerId: 1, // 2024 State Legislative Districts - Upper
    districtField: 'NAMELSAD',
  },
  'state-house': {
    displayName: 'State House Districts',
    endpoint: `${BASE}/Legislative/MapServer`,
    layerId: 2, // 2024 State Legislative Districts - Lower
    districtField: 'NAMELSAD',
  },
  'school-unified': {
    displayName: 'Unified School Districts',
    endpoint: `${BASE}/School/MapServer`,
    layerId: 0,
    districtField: 'NAME',
  },
  'school-elementary': {
    displayName: 'Elementary School Districts',
    endpoint: `${BASE}/School/MapServer`,
    layerId: 2,
    districtField: 'NAME',
  },
  'school-secondary': {
    displayName: 'Secondary School Districts',
    endpoint: `${BASE}/School/MapServer`,
    layerId: 1,
    districtField: 'NAME',
  },
};
