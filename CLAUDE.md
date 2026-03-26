# District Mapper

North Arrow internal tool. Nonprofits upload constituent/program data, overlay US legislative
and school district boundaries, analyze point-in-district distribution, and export enriched
CSVs or PDF reports.

## Stack
- **Framework:** Next.js (Pages Router) — plain JavaScript, no TypeScript
- **Map:** Mapbox GL JS
- **Spatial analysis:** Turf.js (client-side point-in-polygon)
- **CSV:** Papa Parse | **Excel:** SheetJS (xlsx)
- **PDF export:** @react-pdf/renderer
- **Deployment:** Vercel

## Environment variables
```
MAPBOX_TOKEN=           # server-side only — used by /api/geocode
NEXT_PUBLIC_MAPBOX_TOKEN=  # client-side — initializes MapView
```
Both should be set in Vercel project settings. Vercel project name: TBD at first deploy.

## Key files
- `lib/layerConfig.js` — TIGERweb layer definitions. **Layer IDs must be verified** against
  the live service before the boundary fetch is tested. Check:
  `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer?f=json`
- `lib/cityCouncilRegistry.js` — Tier 1 city ArcGIS endpoints. **All arcgisEndpoint values
  are currently null stubs** — they must be researched and filled in before the Local layer works.
- `components/MapView.js` — Mapbox init + imperative API (addBoundaryLayer, addPointLayer, fitBounds)
- `pages/api/boundaries.js` — TIGERweb proxy (resolves CORS)
- `pages/api/geocode.js` — Mapbox Geocoding proxy, batches 50 at a time
- `pages/api/city-councils.js` — City ArcGIS proxy

## Data flow
1. User toggles layer → `index.js` calls `/api/boundaries` → GeoJSON → `MapView.addBoundaryLayer`
2. User uploads CSV/Excel → `UploadModal` detects coords or geocodes → `index.js` → `MapView.addPointLayer`
3. `AnalysisPanel` runs `assignDistricts` (Turf.js) on upload → pivot table
4. Export: `buildEnrichedCSV` merges district columns back → download; or `@react-pdf/renderer` for PDF

## Known stubs (things to complete before launch)
- TIGERweb layer IDs in `lib/layerConfig.js` — need live verification
- All `arcgisEndpoint` values in `lib/cityCouncilRegistry.js` — need research per city
- Custom Shapefile upload (`.shp`) not yet implemented — only GeoJSON works today
- `public/North_Arrow_logo.svg` — copy in from assets
