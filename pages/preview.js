import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import mapboxgl from 'mapbox-gl';
import Head from 'next/head';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { ABBR_TO_FIPS } from '../lib/stateFips';
import Legend from '../components/Legend';

function getDisplayName(id) {
  if (LAYER_CONFIG[id]) return LAYER_CONFIG[id].displayName;
  if (id.startsWith('council-')) {
    const slug = id.slice('council-'.length);
    for (const [, city] of Object.entries(CITY_COUNCIL_REGISTRY)) {
      const extra = (city.extraLayers || []).find((e) => e.slug === slug);
      if (extra) return extra.label;
    }
    const city = CITY_COUNCIL_REGISTRY[slug];
    return city ? `${city.name} Council` : slug;
  }
  return id;
}

function addBoundaryLayer(map, layerMetaRef, id, data, color) {
  if (map.getSource(id)) return;
  map.addSource(id, { type: 'geojson', data });
  map.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.1 } });
  map.addLayer({ id: `${id}-line`, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.8 } });
  layerMetaRef.current[id] = { fillId: `${id}-fill`, displayName: getDisplayName(id) };
}

// Mirror of MapView's setChoropleth — same logic, same intensity ramp
function applyChoropleth(map, layerId, districtCounts, districtField, layerColor, stateField) {
  const fillId = `${layerId}-fill`;
  if (!map.getLayer(fillId)) return;

  const entries = Object.entries(districtCounts).filter(([, c]) => c > 0);
  if (entries.length === 0) return;

  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  let featureKeyExpr;
  let buildKeys;
  if (stateField) {
    featureKeyExpr = ['case',
      ['has', stateField],
      ['concat', ['get', stateField], '|', ['to-string', ['get', districtField]]],
      ['to-string', ['get', districtField]],
    ];
    buildKeys = (name) => {
      const keys = [];
      const _pm = name.match(/^(.+?) [–-] (.+)$/);
      if (_pm) {
        const abbr = _pm[1];
        const districtName = _pm[2];
        const fips = ABBR_TO_FIPS[abbr];
        if (fips) keys.push(`${fips}|${districtName}`);
        keys.push(String(districtName));
      } else {
        keys.push(name);
      }
      return keys;
    };
  } else {
    featureKeyExpr = ['to-string', ['get', districtField]];
    buildKeys = (name) => [String(name)];
  }

  const pairMap = new Map();
  for (const [name, count] of entries) {
    const ratio = count / maxCount;
    for (const key of buildKeys(name)) {
      if (!pairMap.has(key)) pairMap.set(key, ratio);
    }
  }
  const matchPairs = [...pairMap.entries()].flat();
  if (matchPairs.length === 0) return;

  map.setPaintProperty(fillId, 'fill-color', layerColor);
  map.setPaintProperty(fillId, 'fill-opacity',
    ['interpolate', ['linear'], ['match', featureKeyExpr, ...matchPairs, 0], 0, 0.04, 1, 0.72]
  );
}

export default function PreviewPage() {
  const router = useRouter();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const hoverPopupRef = useRef(null);
  const layerMetaRef = useRef({});
  const [activeLayers, setActiveLayers] = useState([]);
  const [layerColors, setLayerColors] = useState({});
  const [dataBatches, setDataBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const { s } = router.query;
    let state;
    try {
      // Unicode-safe decode: mirrors the btoa(unescape(encodeURIComponent(...))) used when encoding
      state = JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch {
      setError('This share link is invalid or expired.');
      setLoading(false);
      return;
    }

    const { center, zoom, layers = [], choro = null, pointBatches = null } = state;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) { setError('Map token not configured.'); setLoading(false); return; }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center || [-96, 38],
      zoom: zoom ?? 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    // Hover popup — same as MapView
    map.on('mousemove', (e) => {
      const meta = layerMetaRef.current;
      const fillIds = Object.values(meta).map((m) => m.fillId).filter((fid) => map.getLayer(fid));
      if (!fillIds.length) { hoverPopupRef.current?.remove(); return; }
      const features = map.queryRenderedFeatures(e.point, { layers: fillIds });
      if (!features.length) { hoverPopupRef.current?.remove(); return; }
      const seen = new Set();
      const lines = [];
      for (const feat of features) {
        const layerId = feat.layer.id.replace(/-fill$/, '');
        if (seen.has(layerId)) continue;
        seen.add(layerId);
        const info = meta[layerId];
        if (!info) continue;
        const p = feat.properties;
        const name = p.NAMELSAD || p.NAME || p.name || p.DISTRICT || p.GEOID || '';
        if (name) lines.push(`<div><span style="color:#7a8fa6">${info.displayName}</span> &mdash; ${name}</div>`);
      }
      if (!lines.length) { hoverPopupRef.current?.remove(); return; }
      if (!hoverPopupRef.current) {
        hoverPopupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      }
      hoverPopupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:'Open Sans',sans-serif;font-size:12px;padding:4px 6px;line-height:1.6">${lines.join('')}</div>`)
        .addTo(map);
    });
    map.on('mouseleave', () => hoverPopupRef.current?.remove());

    map.on('load', async () => {
      setLoading(false);

      // --- Boundary layers ---
      const newActiveLayers = [];
      const newLayerColors = {};

      for (const layer of layers) {
        const { id, type, slug, fips, color } = layer;
        try {
          if (type === 'city') {
            const res = await fetch(`/api/city-councils?city=${slug}`);
            const data = await res.json();
            if (res.ok) { addBoundaryLayer(map, layerMetaRef, id, data, color); newActiveLayers.push(id); newLayerColors[id] = color; }
          } else if (type === 'state' && fips?.length) {
            const results = await Promise.all(
              fips.map((f) => fetch(`/api/boundaries?layer=${id}&stateFips=${f}`).then((r) => r.json()))
            );
            const merged = { type: 'FeatureCollection', features: results.flatMap((r) => r.features || []) };
            addBoundaryLayer(map, layerMetaRef, id, merged, color);
            newActiveLayers.push(id);
            newLayerColors[id] = color;
          } else {
            const res = await fetch(`/api/boundaries?layer=${id}`);
            const data = await res.json();
            if (res.ok) { addBoundaryLayer(map, layerMetaRef, id, data, color); newActiveLayers.push(id); newLayerColors[id] = color; }
          }
        } catch { /* skip layers that fail */ }
      }

      // --- Choropleth ---
      if (choro && newActiveLayers.includes(choro.layerId)) {
        applyChoropleth(map, choro.layerId, choro.counts, choro.districtField, choro.color, choro.stateField);
      }

      setActiveLayers(newActiveLayers);
      setLayerColors(newLayerColors);

      // --- Point batches ---
      if (pointBatches?.length) {
        const allFeatures = pointBatches.flatMap((b, batchIdx) =>
          b.pts.map(([lat, lng]) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { _batchIdx: batchIdx },
          }))
        );

        const colorExpr = pointBatches.length > 1
          ? ['match', ['get', '_batchIdx'],
              ...pointBatches.flatMap((b, i) => [i, b.color]),
              pointBatches[0].color,
            ]
          : pointBatches[0].color;

        map.addSource('preview-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: allFeatures },
        });
        map.addLayer({
          id: 'preview-points',
          type: 'circle',
          source: 'preview-points',
          paint: {
            'circle-radius': 5,
            'circle-color': colorExpr,
            'circle-opacity': 0.85,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': 0.6,
          },
        });

        setDataBatches(pointBatches.map((b) => ({ id: b.label, label: b.label, color: b.color })));
      }
    });

    return () => {
      hoverPopupRef.current?.remove();
      map.remove();
    };
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head><title>District Mapper — Preview</title></Head>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { overflow: hidden; }`}</style>

      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {loading && !error && <div style={centeredMsg}>Loading map…</div>}
        {error && <div style={{ ...centeredMsg, color: '#e63947' }}>{error}</div>}

        {(activeLayers.length > 0 || dataBatches.length > 0) && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
            <Legend activeLayers={activeLayers} layerColors={layerColors} dataBatches={dataBatches} />
          </div>
        )}

        <div style={branding}>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 12, color: '#1c3557' }}>
            District Mapper
          </span>
          <span style={{ fontSize: 11, color: '#7a8fa6', fontFamily: "'Open Sans', sans-serif" }}>
            &nbsp;· Read-only preview
          </span>
        </div>
      </div>
    </>
  );
}

const centeredMsg = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
  background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '12px 20px',
  fontFamily: "'Open Sans', sans-serif", fontSize: 13, color: '#1c3557',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
};

const branding = {
  position: 'absolute', bottom: 32, left: 12, zIndex: 5,
  background: 'rgba(255,255,255,0.92)', borderRadius: 6, padding: '5px 10px',
  display: 'flex', alignItems: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
};
