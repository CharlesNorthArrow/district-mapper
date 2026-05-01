// Data source URLs verified 2026-03-26/27; OZ endpoint re-verified 2026-04-23.
// County Subdivisions (layer /22): FUNCSTAT='A' filter added to exclude coextensive MCDs (NYC overlap fix).
// queryMode:
//   'national'  — fetch all features at once, no state filter (used for Congressional, States)
//   'byState'   — requires stateFips param, queries WHERE STATE='XX' (TIGERweb) or STATEFP='XX'
//   'byBbox'    — spatial envelope query; requires stateFips to look up bbox (used for ZCTA)
// paginated: true — byState layers with potentially thousands of features per state

const TIGERBASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const TIGERWMS = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer';
const LIVING_ATLAS = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services';
const SCHOOL_SVC = 'https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services';
// Full-precision topological service for congressional districts — verified 2026-03-27
// Fields: NAME, GEOID, STATE, CD119. 444 features. maxAllowableOffset=0.001 → ~3.7MB, no gaps.
const CONGRESS_SVC = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Congressional_Districts_v1/FeatureServer/0';
// HUD Opportunity Zones ArcGIS service — verified 2026-04-23. Layer ID is 13 (not 0).
// State field is 'STATE' (2-char abbr), no numeric FIPS field — use byBbox mode.
// Fields: GEOID10, STATE, STUSAB, STATE_NAME
const HUD_OZ_SVC = 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13';

export const LAYER_CONFIG = {
  counties: {
    displayName: 'Counties',
    endpoint: `${TIGERWMS}/82`,
    queryMode: 'byState',         // each county is within one state → state-level
    districtField: 'NAME',
    stateField: 'STATE',          // 2-digit FIPS string, e.g. '17' for Illinois
    maxAllowableOffset: 0.003,
    resultRecordCount: 300,       // max counties in any state: 254 (Texas)
  },
  'county-subdivisions': {
    displayName: 'County Subdivisions (MCDs)',
    endpoint: `${TIGERWMS}/22`,
    queryMode: 'byState',
    paginated: true,              // Michigan alone has ~1,775 MCDs
    districtField: 'NAME',
    stateField: 'STATE',
    maxAllowableOffset: 0.002,
    resultRecordCount: 2000,
    whereExtra: "FUNCSTAT='A'",   // active MCDs only — excludes coextensive entries that overlap in NYC
  },
  'opportunity-zones': {
    displayName: 'Opportunity Zones',
    endpoint: HUD_OZ_SVC,
    queryMode: 'byBbox',          // HUD layer has no numeric FIPS field — bbox query avoids state-field mismatch
    districtField: 'GEOID10',
    stateField: null,
    maxAllowableOffset: 0.001,
    resultRecordCount: 1000,      // max ~900 OZ tracts per state
  },
  'tribal-lands': {
    displayName: 'Native Tribal Lands',
    endpoint: `${TIGERWMS}/36`,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: null,             // tribal lands cross state boundaries
    maxAllowableOffset: 0.001,
    resultRecordCount: 400,
  },
  'urban-areas': {
    displayName: 'Urban Areas (Census-defined)',
    endpoint: `${TIGERWMS}/88`,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: null,
    maxAllowableOffset: 0.002,
    resultRecordCount: 3000,
  },
  'incorporated-places': {
    displayName: 'Incorporated Places',
    endpoint: `${TIGERWMS}/28`,
    queryMode: 'byState',
    districtField: 'NAME',
    stateField: 'STATE',
    maxAllowableOffset: 0.001,
    resultRecordCount: 1000,
    whereExtra: "FUNCSTAT='A'",   // active incorporated places only
  },
  zcta: {
    displayName: 'ZIP Code Areas (ZCTA)',
    endpoint: `${TIGERWMS}/2`,
    queryMode: 'byBbox',          // no STATE field — filter by state bounding box
    districtField: 'ZCTA5',
    stateField: null,
    maxAllowableOffset: 0.001,
    resultRecordCount: 2000,
  },
  congressional: {
    displayName: 'US Congressional Districts',
    endpoint: CONGRESS_SVC,
    queryMode: 'national',
    districtField: 'NAME',
    stateField: 'STATE',  // 2-digit FIPS string, e.g. '17' for Illinois
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
