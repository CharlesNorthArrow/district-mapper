// Data source URLs verified 2026-03-26/27.
// queryMode:
//   'national' — fetch all features at once, no state filter (used for Congressional, States)
//   'byState'  — requires stateFips param, queries WHERE STATE='XX' (TIGERweb) or STATEFP='XX'

const TIGERBASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const LIVING_ATLAS = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services';
const SCHOOL_SVC = 'https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services';

export const LAYER_CONFIG = {
  congressional: {
    displayName: 'US Congressional Districts',
    endpoint: `${LIVING_ATLAS}/USA_Congressional_Districts/FeatureServer/0`,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: null,
    maxAllowableOffset: 0.05,
    resultRecordCount: 500,
  },
  'us-senate': {
    displayName: 'US Senate (States)',
    endpoint: `${LIVING_ATLAS}/USA_States_Generalized_Boundaries/FeatureServer/0`,
    queryMode: 'national',
    districtField: 'STATE_NAME',
    stateField: null,
    maxAllowableOffset: 0.05,
    resultRecordCount: 60,
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
