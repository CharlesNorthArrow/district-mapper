// Tier 1 city ArcGIS REST endpoints for council districts.
// Each entry needs: arcgisEndpoint (full MapServer URL), layerId, districtField.
// IMPORTANT: These endpoints must be verified before the city councils feature is built.
// Several cities use ArcGIS Online (arcgis.com) while others use self-hosted servers.
// Check city open data portals to find the correct feature service URL.
export const CITY_COUNCIL_REGISTRY = {
  nyc: {
    name: 'New York City',
    arcgisEndpoint: null, // TODO: verify — NYC uses https://services5.arcgis.com/...
    layerId: 0,
    districtField: 'CounDist',
  },
  la: {
    name: 'Los Angeles',
    arcgisEndpoint: null, // TODO: verify — LA uses geohub.lacity.org
    layerId: 0,
    districtField: 'NAME',
  },
  chicago: {
    name: 'Chicago',
    arcgisEndpoint: null, // TODO: verify — Chicago uses data.cityofchicago.org GeoJSON or ArcGIS
    layerId: 0,
    districtField: 'DIST_NUM',
  },
  houston: {
    name: 'Houston',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  phoenix: {
    name: 'Phoenix',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  philadelphia: {
    name: 'Philadelphia',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT_N',
  },
  'san-antonio': {
    name: 'San Antonio',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  'san-diego': {
    name: 'San Diego',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  dallas: {
    name: 'Dallas',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  seattle: {
    name: 'Seattle',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'C_DISTRICT',
  },
  portland: {
    name: 'Portland',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  denver: {
    name: 'Denver',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  boston: {
    name: 'Boston',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  atlanta: {
    name: 'Atlanta',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  dc: {
    name: 'Washington, DC',
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'NAME',
  },
};
