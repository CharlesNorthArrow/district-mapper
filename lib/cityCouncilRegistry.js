// Tier 1 city ArcGIS REST endpoints for council districts.
// All endpoints verified 2026-03-27 — returned valid ArcGIS REST JSON and field lists confirmed.

export const CITY_COUNCIL_REGISTRY = {
  nyc: {
    name: 'New York City',
    // Verified: ArcGIS Online FeatureServer, layer 0
    arcgisEndpoint: 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_City_Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'CounDist',
    extraLayers: [
      { slug: 'nyc-nta', label: 'Neighborhood Tabulation Areas' },
    ],
  },
  'nyc-nta': {
    name: 'New York City',
    displayName: 'NYC Neighborhood Tabulation Areas',
    // Verified: NYC DCP 2020 NTAs, ArcGIS Online FeatureServer, layer 0
    arcgisEndpoint: 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Neighborhood_Tabulation_Areas_2020/FeatureServer',
    layerId: 0,
    districtField: 'NTAName',
  },
  la: {
    name: 'Los Angeles',
    // Verified: LA Hub MapServer, Boundaries service layer 13
    arcgisEndpoint: 'https://maps.lacity.org/lahub/rest/services/Boundaries/MapServer',
    layerId: 13,
    districtField: 'District',
  },
  chicago: {
    name: 'Chicago',
    // Verified: Chicago calls these "Wards" (50 aldermanic wards), layer 77 in operational MapServer
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
    // Verified: ArcGIS Online FeatureServer — City of Phoenix open data
    arcgisEndpoint: 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'District',
  },
  philadelphia: {
    name: 'Philadelphia',
    // Verified: ArcGIS Online FeatureServer — City of Philadelphia open data
    arcgisEndpoint: 'https://services7.arcgis.com/ZodPOMBKsdAsTqF4/arcgis/rest/services/Philadelphia_City_Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'District',
  },
  'san-antonio': {
    name: 'San Antonio',
    // Verified: ArcGIS Online FeatureServer — CoSAGIS open data, layer 2
    arcgisEndpoint: 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/CouncilDistricts/FeatureServer',
    layerId: 2,
    districtField: 'District',
  },
  'san-diego': {
    name: 'San Diego',
    // Verified: SANDAG hosted FeatureServer
    arcgisEndpoint: 'https://geo.sandag.org/server/rest/services/Hosted/Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'district',
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
    // Verified: ArcGIS Online FeatureServer — Seattle City GIS open data (2022 redistricting)
    arcgisEndpoint: 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Seattle_City_Council_Districts/FeatureServer',
    layerId: 0,
    districtField: 'C_DISTRICT',
  },
  portland: {
    name: 'Portland',
    // Verified: Portland Maps open data MapServer — 2023 redistricted boundaries, layer 1413
    arcgisEndpoint: 'https://www.portlandmaps.com/od/rest/services/COP_OpenData_Boundary/MapServer',
    layerId: 1413,
    districtField: 'DISTRICT',
  },
  denver: {
    name: 'Denver',
    // Verified: ArcGIS Online FeatureServer — Denver open data, layer 3 (DIST_NUM field)
    arcgisEndpoint: 'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_ADMN_COUNCILDIST_A/FeatureServer',
    layerId: 3,
    districtField: 'DIST_NUM',
  },
  boston: {
    name: 'Boston',
    // Verified: ArcGIS Online FeatureServer — Boston open data, 2023 redistricting effective Jan 2024
    arcgisEndpoint: 'https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/CityCouncilDistricts_2023_5_25/FeatureServer',
    layerId: 0,
    districtField: 'DISTRICT',
  },
  atlanta: {
    name: 'Atlanta',
    // Verified: Atlanta DPCD MapServer — GeopoliticalArea service, layer 4 (NAME field = "District 1" etc.)
    arcgisEndpoint: 'https://gis.atlantaga.gov/dpcd/rest/services/AdministrativeArea/GeopoliticalArea/MapServer',
    layerId: 4,
    districtField: 'NAME',
  },
  dc: {
    name: 'Washington, DC',
    // Verified: DC GIS MapServer — Administrative_Other_Boundaries, layer 53 (Ward - 2022)
    arcgisEndpoint: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Administrative_Other_Boundaries_WebMercator/MapServer',
    layerId: 53,
    districtField: 'WARD',
  },
};
