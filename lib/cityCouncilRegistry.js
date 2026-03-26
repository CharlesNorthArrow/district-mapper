// Tier 1 city ArcGIS REST endpoints for council districts.
// Endpoints verified on 2026-03-26. Null entries need research — see comments for starting points.
// All verified endpoints tested: returned valid ArcGIS REST JSON and queryable at /query.

export const CITY_COUNCIL_REGISTRY = {
  nyc: {
    name: 'New York City',
    // Verified: ArcGIS Online FeatureServer, layer 0
    arcgisEndpoint: 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_City_Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'CounDist',
  },
  la: {
    name: 'Los Angeles',
    // TODO: verify — try LA GeoHub: https://geohub.lacity.org, search "city council districts"
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  chicago: {
    name: 'Chicago',
    // Verified: Chicago calls these "Wards" (50 aldermanic wards), layer 77 in operational MapServer
    // Display name adjusted — Chicago uses ward system, not numbered council districts
    arcgisEndpoint: 'https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/operational/MapServer',
    layerId: 77,
    districtField: 'WARD',
  },
  houston: {
    name: 'Houston',
    // Verified: Harris County GIS server, COH_Council_Districts layer
    arcgisEndpoint: 'https://www.gis.hctx.net/arcgis/rest/services/CoH/CoH_Boundaries/MapServer',
    layerId: 0,
    districtField: 'DISTRICT',
  },
  phoenix: {
    name: 'Phoenix',
    // TODO: verify — try https://mapping-phoenix.opendata.arcgis.com or Phoenix ArcGIS Online org
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  philadelphia: {
    name: 'Philadelphia',
    // TODO: verify — try https://data-phl.opendata.arcgis.com, search "council districts"
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT_N',
  },
  'san-antonio': {
    name: 'San Antonio',
    // TODO: verify — try https://opendata-cosagis.opendata.arcgis.com (City of San Antonio open data)
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  'san-diego': {
    name: 'San Diego',
    // TODO: verify — try https://sandiegoca.gov GIS or SANDAG open data portal
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  dallas: {
    name: 'Dallas',
    // Verified: Dallas City Hall ArcGIS server, Council Districts layer
    arcgisEndpoint: 'https://egis.dallascityhall.com/arcgis/rest/services/Basemap/CouncilAreas/MapServer',
    layerId: 0,
    districtField: 'DISTRICT',
  },
  seattle: {
    name: 'Seattle',
    // TODO: verify — try https://data-seattlecitygis.opendata.arcgis.com, search "council districts"
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'C_DISTRICT',
  },
  portland: {
    name: 'Portland',
    // TODO: verify — try https://gis-pdx.opendata.arcgis.com (Portland Maps open data)
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  denver: {
    name: 'Denver',
    // TODO: verify — try https://opendata-geospatialdenver.hub.arcgis.com, search "council districts"
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT_NUM',
  },
  boston: {
    name: 'Boston',
    // TODO: verify — try https://bostonopendata-boston.opendata.arcgis.com, search "city council districts"
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'DISTRICT',
  },
  atlanta: {
    name: 'Atlanta',
    // TODO: verify — gis.atlantaga.gov timed out; try https://opendata.atlantaga.gov
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'COUNCIL_DISTRICT',
  },
  dc: {
    name: 'Washington, DC',
    // TODO: verify — try https://opendata.dc.gov, search "wards" (DC uses ward system)
    // DC uses 8 wards, not numbered council districts
    arcgisEndpoint: null,
    layerId: 0,
    districtField: 'WARD',
  },
};
