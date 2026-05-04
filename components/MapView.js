import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { ABBR_TO_FIPS } from '../lib/stateFips';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';

function hexToRgbTuple(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [70, 124, 157];
}

function canvasRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getBoundaryDisplayName(id) {
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

function buildPopupHTML(properties) {
  const skip = new Set(['_rowIndex', '_globalIndex', '_batchId', '_geocodeConfidence', '_datasetLabel', 'lat', 'lng']);
  const rows = Object.entries(properties)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `
      <tr>
        <td style="padding:3px 8px 3px 0;color:#7a8fa6;white-space:nowrap;vertical-align:top;font-size:11px">${k}</td>
        <td style="padding:3px 0;font-weight:600;color:#1c3557;font-size:12px;word-break:break-word">${v ?? ''}</td>
      </tr>`)
    .join('');
  const header = properties._datasetLabel
    ? `<div style="font-family:'Open Sans',sans-serif;font-size:11px;font-weight:700;color:#fff;background:#1c3557;padding:5px 10px;margin:-8px -10px 6px;border-radius:3px 3px 0 0">${properties._datasetLabel}</div>`
    : '';
  return `<div style="max-height:260px;overflow-y:auto;font-family:'Open Sans',sans-serif;padding:8px 10px">
    ${header}<table style="border-collapse:collapse;width:100%">${rows}</table>
  </div>`;
}

const MapView = forwardRef(function MapView({ onMoveEnd }, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const addedLayers = useRef(new Set());
  const popupRef = useRef(null);
  const hoverPopupRef = useRef(null);
  const choroDataRef = useRef(null); // { layerId, plainCounts, total, districtField }
  const layerMetaRef = useRef({}); // { [layerId]: { fillId, displayName } }
  const pointClickHandlerRef = useRef(null);
  const pointEnterHandlerRef = useRef(null);
  const pointLeaveHandlerRef = useRef(null);
  const lookupHighlightIds = useRef([]);
  const styleReadyRef = useRef(false); // true once the map 'load' event has fired; stays true permanently

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      containerRef.current.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#e63947;font-size:14px;padding:24px;text-align:center">' +
        'Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables.</div>';
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-96, 38],
      zoom: 4,
      preserveDrawingBuffer: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;
    map.once('load', () => { styleReadyRef.current = true; });

    map.on('moveend', () => {
      const c = map.getCenter();
      onMoveEnd?.({ center: { lng: c.lng, lat: c.lat }, zoom: map.getZoom() });
    });

    // Single global boundary hover handler — queries all active fill layers
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
        const choro = choroDataRef.current;
        const districtName = String(p[choro?.districtField ?? 'NAME'] ?? p.NAMELSAD ?? p.NAME ?? p.name ?? p.DISTRICT ?? p.GEOID ?? '');
        if (choro && choro.layerId === layerId) {
          const count = choro.plainCounts[districtName] ?? 0;
          const pct = choro.total > 0 ? ((count / choro.total) * 100).toFixed(1) : '0.0';
          lines.push(
            `<div style="padding:8px 10px 6px;min-width:155px">` +
            `<div style="font-size:10px;font-weight:700;color:#9aabb8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">${info.displayName}</div>` +
            (districtName ? `<div style="font-size:14px;font-weight:700;color:#1c3557;line-height:1.25;margin-bottom:7px">${districtName}</div>` : '') +
            `<div style="display:flex;gap:18px">` +
            `<div><div style="font-size:10px;color:#9aabb8;margin-bottom:2px">Points</div><div style="font-size:13px;font-weight:700;color:#1c3557">${count.toLocaleString()}</div></div>` +
            `<div><div style="font-size:10px;color:#9aabb8;margin-bottom:2px">% of Total</div><div style="font-size:13px;font-weight:700;color:#467c9d">${pct}%</div></div>` +
            `</div></div>`
          );
        } else {
          if (districtName) lines.push(
            `<div style="padding:8px 10px 6px">` +
            `<div style="font-size:10px;font-weight:700;color:#9aabb8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">${info.displayName}</div>` +
            `<div style="font-size:13px;font-weight:700;color:#1c3557">${districtName}</div>` +
            `</div>`
          );
        }
      }

      if (!lines.length) { hoverPopupRef.current?.remove(); return; }

      if (!hoverPopupRef.current) {
        hoverPopupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      }
      hoverPopupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:'Open Sans',sans-serif">${lines.join('<div style="height:1px;background:#eef1f4;margin:0 10px"></div>')}</div>`)
        .addTo(map);
    });

    map.on('mouseout', () => { hoverPopupRef.current?.remove(); });

    return () => map.remove();
  }, []);

  useImperativeHandle(ref, () => ({
    addBoundaryLayer(id, geojson, color) {
      const map = mapRef.current;
      if (!map) return;

      const doAdd = () => {
        const fillId = `${id}-fill`;
        const lineId = `${id}-line`;
        const hFillId = `lookup-${id}-fill`;
        const hLineId = `lookup-${id}-line`;
        if (map.getLayer(hFillId)) map.removeLayer(hFillId);
        if (map.getLayer(hLineId)) map.removeLayer(hLineId);
        lookupHighlightIds.current = lookupHighlightIds.current.filter((h) => h !== `lookup-${id}`);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getSource(id)) map.removeSource(id);

        const beforeLayer = map.getLayer('uploaded-points') ? 'uploaded-points' : undefined;
        map.addSource(id, { type: 'geojson', data: geojson });
        map.addLayer({ id: fillId, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.1 } }, beforeLayer);
        map.addLayer({ id: lineId, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.8 } }, beforeLayer);
        addedLayers.current.add(id);
        layerMetaRef.current[id] = { fillId, displayName: getBoundaryDisplayName(id) };
      };

      if (styleReadyRef.current) doAdd();
      else map.once('load', doAdd);
    },

    removeBoundaryLayer(id) {
      const map = mapRef.current;
      if (!map) return;
      delete layerMetaRef.current[id];
      // Clean up count labels before removing source
      const cntLbl = `${id}-cnt-lbl`;
      const cntSrc = `${id}-cnt-src`;
      if (map.getLayer(cntLbl)) map.removeLayer(cntLbl);
      if (map.getSource(cntSrc)) map.removeSource(cntSrc);
      const hFillId = `lookup-${id}-fill`;
      const hLineId = `lookup-${id}-line`;
      if (map.getLayer(hFillId)) map.removeLayer(hFillId);
      if (map.getLayer(hLineId)) map.removeLayer(hLineId);
      lookupHighlightIds.current = lookupHighlightIds.current.filter((h) => h !== `lookup-${id}`);
      if (map.getLayer(`${id}-fill`)) map.removeLayer(`${id}-fill`);
      if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
      if (map.getSource(id)) map.removeSource(id);
      addedLayers.current.delete(id);
    },

    // batchColors: { [batchId]: colorString } — used to color points per dataset
    setPointLayer(points, batchColors = {}) {
      const map = mapRef.current;
      if (!map) return;

      const doSet = () => {
        if (pointClickHandlerRef.current) {
          map.off('click', 'uploaded-points', pointClickHandlerRef.current);
          map.off('mouseenter', 'uploaded-points', pointEnterHandlerRef.current);
          map.off('mouseleave', 'uploaded-points', pointLeaveHandlerRef.current);
        }
        if (map.getLayer('uploaded-points')) map.removeLayer('uploaded-points');
        if (map.getSource('uploaded-points')) map.removeSource('uploaded-points');

        const geojson = {
          type: 'FeatureCollection',
          features: points.map((p) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { ...p },
          })),
        };

        const entries = Object.entries(batchColors);
        const colorExpr = entries.length > 1
          ? ['match', ['get', '_batchId'], ...entries.flatMap(([id, c]) => [id, c]), '#e63947']
          : (entries[0]?.[1] ?? '#e63947');

        map.addSource('uploaded-points', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'uploaded-points',
          type: 'circle',
          source: 'uploaded-points',
          paint: {
            'circle-radius': 5,
            'circle-color': colorExpr,
            'circle-opacity': 0.85,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        });

        if (!popupRef.current) {
          popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '320px' });
        }
        const popup = popupRef.current;

        const clickHandler = (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          popup.setLngLat(e.lngLat).setHTML(buildPopupHTML(feature.properties)).addTo(map);
        };
        const enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
        const leaveHandler = () => { map.getCanvas().style.cursor = ''; };

        map.on('click', 'uploaded-points', clickHandler);
        map.on('mouseenter', 'uploaded-points', enterHandler);
        map.on('mouseleave', 'uploaded-points', leaveHandler);

        pointClickHandlerRef.current = clickHandler;
        pointEnterHandlerRef.current = enterHandler;
        pointLeaveHandlerRef.current = leaveHandler;
      };

      if (styleReadyRef.current) doSet();
      else map.once('load', doSet);
    },

    fitBounds(bbox) {
      const map = mapRef.current;
      if (!map) return;
      const [west, south, east, north] = bbox;
      const doFit = () => map.fitBounds([[west, south], [east, north]], { padding: 60, maxZoom: 14 });
      if (styleReadyRef.current) doFit();
      else map.once('load', doFit);
    },

    flyTo({ center, zoom }) {
      const map = mapRef.current;
      if (!map) return;
      const doFly = () => map.flyTo({ center: [center.lng, center.lat], zoom });
      if (styleReadyRef.current) doFly();
      else map.once('load', doFly);
    },

    filterPoints(indices) {
      const map = mapRef.current;
      if (!map?.getLayer('uploaded-points')) return;
      map.setFilter('uploaded-points', ['in', ['get', '_globalIndex'], ['literal', indices]]);
    },

    clearPointFilter() {
      const map = mapRef.current;
      if (!map?.getLayer('uploaded-points')) return;
      map.setFilter('uploaded-points', null);
    },

    filterBoundaryToDistrict(layerId, districtField, districtName, stateField) {
      const map = mapRef.current;
      if (!map) return;
      let filter;
      const _fm = stateField && districtName.match(/^(.+?) [–-] (.+)$/);
      if (_fm) {
        const abbr = _fm[1];
        const dName = _fm[2];
        const fips = ABBR_TO_FIPS[abbr];
        filter = fips
          ? ['all', ['==', ['get', stateField], fips], ['==', ['to-string', ['get', districtField]], dName]]
          : ['==', ['to-string', ['get', districtField]], dName];
      } else {
        filter = ['==', ['to-string', ['get', districtField]], String(districtName)];
      }
      if (map.getLayer(`${layerId}-fill`)) map.setFilter(`${layerId}-fill`, filter);
      if (map.getLayer(`${layerId}-line`)) map.setFilter(`${layerId}-line`, filter);
    },

    fitToDistrict(layerId, districtField, districtName, stateField) {
      const map = mapRef.current;
      if (!map || !map.getSource(layerId)) return;
      let filter;
      const _fm = stateField && districtName.match(/^(.+?) [–-] (.+)$/);
      if (_fm) {
        const abbr = _fm[1];
        const dName = _fm[2];
        const fips = ABBR_TO_FIPS[abbr];
        filter = fips
          ? ['all', ['==', ['get', stateField], fips], ['==', ['to-string', ['get', districtField]], dName]]
          : ['==', ['to-string', ['get', districtField]], dName];
      } else {
        filter = ['==', ['to-string', ['get', districtField]], String(districtName)];
      }
      const features = map.querySourceFeatures(layerId, { filter });
      if (!features.length) return;
      const coords = [];
      for (const feat of features) {
        const geom = feat.geometry;
        if (!geom) continue;
        if (geom.type === 'Polygon') geom.coordinates.forEach((r) => coords.push(...r));
        else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => p.forEach((r) => coords.push(...r)));
      }
      if (!coords.length) return;
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14 });
    },

    clearBoundaryFilter(layerId) {
      const map = mapRef.current;
      if (!map) return;
      if (map.getLayer(`${layerId}-fill`)) map.setFilter(`${layerId}-fill`, null);
      if (map.getLayer(`${layerId}-line`)) map.setFilter(`${layerId}-line`, null);
    },

    isolateLayer(layerId) {
      const map = mapRef.current;
      if (!map) return;
      for (const id of addedLayers.current) {
        const vis = id === layerId ? 'visible' : 'none';
        if (map.getLayer(`${id}-fill`)) map.setLayoutProperty(`${id}-fill`, 'visibility', vis);
        if (map.getLayer(`${id}-line`)) map.setLayoutProperty(`${id}-line`, 'visibility', vis);
      }
    },

    showAllLayers() {
      const map = mapRef.current;
      if (!map) return;
      choroDataRef.current = null;
      for (const id of addedLayers.current) {
        if (map.getLayer(`${id}-fill`)) {
          map.setLayoutProperty(`${id}-fill`, 'visibility', 'visible');
          map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.1);  // clear any choropleth
        }
        if (map.getLayer(`${id}-line`)) map.setLayoutProperty(`${id}-line`, 'visibility', 'visible');
      }
    },

    setChoropleth(layerId, districtCounts, districtField, layerColor, stateField, plainCounts = {}, total = 0) {
      choroDataRef.current = { layerId, plainCounts, total, districtField };
      const map = mapRef.current;
      if (!map) return;
      const fillId = `${layerId}-fill`;
      if (!map.getLayer(fillId)) return;

      const entries = Object.entries(districtCounts).filter(([, c]) => c > 0);
      if (entries.length === 0) {
        map.setPaintProperty(fillId, 'fill-color', layerColor);
        map.setPaintProperty(fillId, 'fill-opacity', 0.1);
        return;
      }

      const maxCount = Math.max(...entries.map(([, c]) => c), 1);

      // When the layer has a stateField, district names are "IL – 10" and GeoJSON features
      // have both a STATE (FIPS) and NAME field. Build composite keys "17|10" to avoid
      // shading district 10 in every state when only IL-10 has constituents.
      let featureKeyExpr;
      let buildKeys; // returns array of keys for a single district name (may be 1 or 2)
      if (stateField) {
        // Use composite "FIPS|districtName" when STATE is present; fall back to plain name
        // for features that pre-date the outFields fix and lack the STATE property.
        featureKeyExpr = ['case',
          ['has', stateField],
          ['concat', ['get', stateField], '|', ['to-string', ['get', districtField]]],
          ['to-string', ['get', districtField]],
        ];
        buildKeys = (name) => {
          const keys = [];
          const _km = name.match(/^(.+?) [–-] (.+)$/);
          if (_km) {
            const abbr = _km[1];
            const districtName = _km[2];
            const fips = ABBR_TO_FIPS[abbr];
            if (fips) keys.push(`${fips}|${districtName}`);
            keys.push(String(districtName)); // plain-name fallback for cached features without STATE
          } else {
            keys.push(name);
          }
          return keys;
        };
      } else {
        // Coerce to string so integer-typed district fields (e.g. CounDist = 5)
        // match string keys ("5") in the match expression.
        featureKeyExpr = ['to-string', ['get', districtField]];
        buildKeys = (name) => [String(name)];
      }

      // Use a Map to deduplicate keys (a plain districtName key must not appear twice
      // if two different state-qualified names share the same plain name).
      const pairMap = new Map();
      for (const [name, count] of entries) {
        const ratio = count / maxCount;
        for (const key of buildKeys(name)) {
          if (!pairMap.has(key)) pairMap.set(key, ratio);
        }
      }
      const matchPairs = [...pairMap.entries()].flat();

      if (matchPairs.length === 0) {
        map.setPaintProperty(fillId, 'fill-color', layerColor);
        map.setPaintProperty(fillId, 'fill-opacity', 0.1);
        return;
      }

      const matchExpr = ['match', featureKeyExpr, ...matchPairs, 0];

      map.setPaintProperty(fillId, 'fill-color', layerColor);
      map.setPaintProperty(fillId, 'fill-opacity',
        ['interpolate', ['linear'], matchExpr, 0, 0.04, 1, 0.72]
      );
    },

    clearChoropleth(layerId) {
      const map = mapRef.current;
      if (!map) return;
      const fillId = `${layerId}-fill`;
      if (map.getLayer(fillId)) {
        map.setPaintProperty(fillId, 'fill-opacity', 0.1);
      }
      if (choroDataRef.current?.layerId === layerId) choroDataRef.current = null;
    },

    // highlights: [{ layerId, displayName, districtField, stateField }]
    // Adds a temporary amber highlight layer for each matched lookup district.
    setLookupHighlights(highlights) {
      const map = mapRef.current;
      if (!map) return;
      // Remove previous highlights
      for (const hId of lookupHighlightIds.current) {
        if (map.getLayer(`${hId}-fill`)) map.removeLayer(`${hId}-fill`);
        if (map.getLayer(`${hId}-line`)) map.removeLayer(`${hId}-line`);
      }
      lookupHighlightIds.current = [];
      if (!highlights?.length) return;

      for (const { layerId, displayName, districtField, stateField } of highlights) {
        if (!map.getSource(layerId)) continue;
        let filter;
        const _lm = stateField && displayName.match(/^(.+?) [–-] (.+)$/);
        if (_lm) {
          const abbr = _lm[1];
          const districtName = _lm[2];
          const fips = ABBR_TO_FIPS[abbr];
          filter = fips
            ? ['all', ['==', ['get', stateField], fips], ['==', ['get', districtField], districtName]]
            : ['==', ['get', districtField], districtName];
        } else {
          filter = ['==', ['get', districtField], displayName];
        }
        const hFillId = `lookup-${layerId}-fill`;
        const hLineId = `lookup-${layerId}-line`;
        map.addLayer({ id: hFillId, type: 'fill', source: layerId, filter,
          paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.35 } });
        map.addLayer({ id: hLineId, type: 'line', source: layerId, filter,
          paint: { 'line-color': '#d97706', 'line-width': 2.5, 'line-opacity': 1 } });
        lookupHighlightIds.current.push(`lookup-${layerId}`);
      }
    },

    clearLookupHighlights() {
      const map = mapRef.current;
      if (!map) return;
      for (const hId of lookupHighlightIds.current) {
        if (map.getLayer(`${hId}-fill`)) map.removeLayer(`${hId}-fill`);
        if (map.getLayer(`${hId}-line`)) map.removeLayer(`${hId}-line`);
      }
      lookupHighlightIds.current = [];
    },

    clearSearchPin() {
      const map = mapRef.current;
      if (!map) return;
      if (map.getLayer('search-pin')) map.removeLayer('search-pin');
      if (map.getSource('search-pin')) map.removeSource('search-pin');
    },

    addCountLabels(layerId, geojson, countsMap, districtField) {
      const map = mapRef.current;
      if (!map || !geojson?.features?.length) return;
      const srcId = `${layerId}-cnt-src`;
      const lyrId = `${layerId}-cnt-lbl`;
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);

      const features = [];
      for (const f of geojson.features) {
        const name = districtField
          ? String(f.properties[districtField] ?? '')
          : String(f.properties.NAME ?? f.properties.name ?? '');
        const count = countsMap[name] ?? 0;
        if (count === 0) continue;
        try {
          const c = turf.centroid(f);
          features.push({
            type: 'Feature',
            geometry: c.geometry,
            properties: { label: count.toLocaleString() },
          });
        } catch { /* skip malformed geometries */ }
      }

      // Insert labels above boundary fill but below points
      const beforeLayer = map.getLayer('uploaded-points') ? 'uploaded-points' : undefined;
      map.addSource(srcId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
      map.addLayer({
        id: lyrId,
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#1c3557',
          'text-halo-color': 'rgba(255,255,255,0.92)',
          'text-halo-width': 2,
        },
      }, beforeLayer);
    },

    removeCountLabels(layerId) {
      const map = mapRef.current;
      if (!map) return;
      const lyrId = `${layerId}-cnt-lbl`;
      const srcId = `${layerId}-cnt-src`;
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);
    },

    addSearchPin(lng, lat) {
      const map = mapRef.current;
      if (!map) return;
      if (map.getLayer('search-pin')) map.removeLayer('search-pin');
      if (map.getSource('search-pin')) map.removeSource('search-pin');
      map.addSource('search-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {},
        },
      });
      map.addLayer({
        id: 'search-pin',
        type: 'circle',
        source: 'search-pin',
        paint: {
          'circle-radius': 9,
          'circle-color': '#1c3557',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.flyTo({ center: [lng, lat], zoom: 14 });
    },

    async captureImage({ activeLayers = [], layerColors = {}, dataBatches = [], choroLayer, choroColor, choroMax = 0, layerDisplayNames = {} } = {}) {
      const mapCanvas = mapRef.current?.getCanvas();
      if (!mapCanvas) return;

      const W = mapCanvas.width;
      const H = mapCanvas.height;
      const dpr = window.devicePixelRatio || 1;
      const sc = dpr; // scale factor for UI elements

      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const ctx = out.getContext('2d');

      ctx.drawImage(mapCanvas, 0, 0);

      // Load logo
      const logo = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = '/North_Arrow_icon.png';
      });

      // === Credits bar ===
      const barH = Math.round(22 * sc);
      ctx.fillStyle = 'rgba(28,53,87,0.88)';
      ctx.fillRect(0, H - barH, W, barH);

      const creditsText = 'Made with District Mapper · A nonprofit tool by North Arrow';
      ctx.font = `${Math.round(10 * sc)}px "Open Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.80)';
      ctx.textBaseline = 'middle';
      const creditsY = H - barH / 2;
      let textX = Math.round(10 * sc);

      if (logo) {
        const logoSz = Math.round(14 * sc);
        ctx.drawImage(logo, Math.round(8 * sc), H - barH + (barH - logoSz) / 2, logoSz, logoSz);
        textX = Math.round(28 * sc);
      }
      ctx.fillText(creditsText, textX, creditsY);

      // === Legend panel ===
      const hasChoro = choroLayer && choroColor;
      const legendItems = [];
      for (const b of dataBatches) legendItems.push({ type: 'batch', color: b.color, label: b.label });
      if (dataBatches.length > 0 && activeLayers.length > 0) legendItems.push({ type: 'divider' });
      for (const id of activeLayers) legendItems.push({ type: 'layer', color: layerColors[id] || '#467c9d', label: layerDisplayNames[id] || id });

      if (legendItems.length > 0 || hasChoro) {
        const pad = Math.round(10 * sc);
        const rowH = Math.round(19 * sc);
        const legW = Math.round(170 * sc);
        const margin = Math.round(12 * sc);
        const contentRows = legendItems.filter((i) => i.type !== 'divider').length;
        const dividers = legendItems.filter((i) => i.type === 'divider').length;
        let legH = pad * 2 + contentRows * rowH + dividers * Math.round(10 * sc);
        if (hasChoro) legH += (legendItems.length > 0 ? Math.round(10 * sc) : 0) + Math.round(44 * sc);

        const legX = W - legW - margin;
        const legY = margin;

        // Panel background
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        canvasRoundRect(ctx, legX, legY, legW, legH, Math.round(6 * sc));
        ctx.fill();

        let y = legY + pad;

        for (const item of legendItems) {
          if (item.type === 'divider') {
            ctx.strokeStyle = '#dde3ea';
            ctx.lineWidth = Math.round(1 * sc);
            ctx.beginPath();
            ctx.moveTo(legX + pad, y + Math.round(5 * sc));
            ctx.lineTo(legX + legW - pad, y + Math.round(5 * sc));
            ctx.stroke();
            y += Math.round(10 * sc);
            continue;
          }
          if (item.type === 'batch') {
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(legX + pad + Math.round(5 * sc), y + rowH / 2, Math.round(5 * sc), 0, Math.PI * 2);
            ctx.fill();
          } else {
            const sw = Math.round(18 * sc);
            const sh = Math.round(11 * sc);
            const sx = legX + pad;
            const sy = y + (rowH - sh) / 2;
            ctx.fillStyle = item.color;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(sx, sy, sw, sh);
            ctx.globalAlpha = 0.8;
            ctx.fillRect(sx, sy + sh * 0.3, sw, sh * 0.4);
            ctx.globalAlpha = 1;
          }
          ctx.font = `${Math.round(10 * sc)}px "Open Sans", sans-serif`;
          ctx.fillStyle = '#1c3557';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.label, legX + pad + Math.round(24 * sc), y + rowH / 2);
          y += rowH;
        }

        if (hasChoro) {
          if (legendItems.length > 0) {
            ctx.strokeStyle = '#dde3ea';
            ctx.lineWidth = Math.round(1 * sc);
            ctx.beginPath();
            ctx.moveTo(legX + pad, y + Math.round(5 * sc));
            ctx.lineTo(legX + legW - pad, y + Math.round(5 * sc));
            ctx.stroke();
            y += Math.round(10 * sc);
          }
          ctx.font = `${Math.round(9 * sc)}px "Open Sans", sans-serif`;
          ctx.fillStyle = '#9aabb8';
          ctx.textBaseline = 'top';
          ctx.fillText('INTENSITY', legX + pad, y);
          y += Math.round(13 * sc);

          const barW = legW - pad * 2;
          const barHt = Math.round(8 * sc);
          const [r, g, b] = hexToRgbTuple(choroColor);
          const grad = ctx.createLinearGradient(legX + pad, 0, legX + pad + barW, 0);
          grad.addColorStop(0, `rgba(${r},${g},${b},0.08)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0.72)`);
          ctx.fillStyle = grad;
          const bry = y;
          ctx.beginPath();
          ctx.roundRect?.(legX + pad, bry, barW, barHt, Math.round(3 * sc));
          ctx.fill();
          if (!ctx.roundRect) { ctx.fillRect(legX + pad, bry, barW, barHt); }

          y += barHt + Math.round(3 * sc);
          ctx.font = `${Math.round(9 * sc)}px "Open Sans", sans-serif`;
          ctx.fillStyle = '#7a8fa6';
          ctx.textBaseline = 'top';
          ctx.fillText('0', legX + pad, y);
          const maxLabel = choroMax.toLocaleString();
          const maxW = ctx.measureText(maxLabel).width;
          ctx.fillText(maxLabel, legX + pad + barW - maxW, y);
        }
      }

      out.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'district-map.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    },

    getCenter() { return mapRef.current?.getCenter(); },
    getZoom() { return mapRef.current?.getZoom(); },
  }));

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

export default MapView;
