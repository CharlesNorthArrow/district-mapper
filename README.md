# District Mapper

North Arrow internal tool for nonprofits. Upload constituent or program data, overlay US legislative and school district boundaries, analyze how your points are distributed across districts, and export enriched CSVs or PDF reports.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create a `.env.local` file at the project root:

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Client-side — initializes the map |
| `MAPBOX_TOKEN` | Server-side — `/api/geocode` batch geocoding |
| `RESEND_API_KEY` | Server-side — `/api/request-geography` and `/api/request-upgrade` (email sending) |

All three must also be set in Vercel project settings before deploying.

## Known gaps

- Custom Shapefile (`.shp`) upload is not yet implemented — only GeoJSON works for custom boundary upload
- `public/North_Arrow_logo.svg` — PNG assets are present; SVG needs to be copied in from North Arrow assets
