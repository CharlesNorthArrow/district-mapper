// Data source URLs verified 2026-03-26/27.
// queryMode:
//   'national' — fetch all features at once, no state filter (used for Congressional, States)
//   'byState'  — requires stateFips param, queries WHERE STATE='XX' (TIGERweb) or STATEFP='XX'

const TIGERBASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const TIGERWMS = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer';
const LIVING_ATLAS = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services';
const SCHOOL_SVC = 'https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services';
// Full-precision topological service for congressional districts — verified 2026-03-27
// Fields: NAME, GEOID, STATE, CD119. 444 features. maxAllowableOffset=0.001 → ~3.7MB, no gaps.
const CONGRESS_SVC = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Congressional_Districts_v1/FeatureServer/0';

export const LAYER_CONFIG = {
  congressional: {
    displayName: 'US Congressional Districts',
    endpoint: CONGRESS_SVC,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: null,
    maxAllowableOffset: 0.001,
    resultRecordCount: 500,
  },
  'us-senate': {
    displayName: 'US Senate (States)',
    endpoint: `${TIGERWMS}/80`,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: null,
    maxAllowableOffset: 0.001,
    resultRecordCount: 60,
    whereExtra: "STUSAB NOT IN ('AS','GU','MP','PR','VI')",
  },
  'state-senate': {
    displayName: 'State Senate Districts',
    endpoint: `${TIGERBASE}/Legislative/MapServer/1`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATE',          // TIGERweb uses numeric FIPS string: '17'
    maxAllowableOffset: 0.001,
    resultRecordCount: 250,
  },
  'state-house': {
    displayName: 'State House Districts',
    endpoint: `${TIGERBASE}/Legislative/MapServer/2`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATE',
    maxAllowableOffset: 0.001,
    resultRecordCount: 250,
  },
  'school-unified': {
    displayName: 'Unified School Districts',
    endpoint: `${SCHOOL_SVC}/School_Districts_Current/FeatureServer/0`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATEFP',        // Living Atlas uses string FIPS: '17'
    maxAllowableOffset: 0.002,
    resultRecordCount: 500,
    whereExtra: "UNSDLEA IS NOT NULL AND UNSDLEA <> '00000'",
  },
  'school-elementary': {
    displayName: 'Elementary School Districts',
    endpoint: `${SCHOOL_SVC}/School_Districts_Current/FeatureServer/0`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATEFP',
    maxAllowableOffset: 0.002,
    resultRecordCount: 500,
    whereExtra: "ELSDLEA IS NOT NULL AND ELSDLEA <> '00000'",
  },
  'school-secondary': {
    displayName: 'Secondary School Districts',
    endpoint: `${SCHOOL_SVC}/School_Districts_Current/FeatureServer/0`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATEFP',
    maxAllowableOffset: 0.002,
    resultRecordCount: 500,
    whereExtra: "SCSDLEA IS NOT NULL AND SCSDLEA <> '00000'",
  },
};
