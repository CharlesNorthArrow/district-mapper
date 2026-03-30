import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { ABBR_TO_FIPS } from '../lib/stateFips';

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

const MapView = forwardRef(function MapView(_, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const addedLayers = useRef(new Set());
  const popupRef = useRef(null);
  const pointClickHandlerRef = useRef(null);
  const pointEnterHandlerRef = useRef(null);
  const pointLeaveHandlerRef = useRef(null);
  const lookupHighlightIds = useRef([]);

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
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useImperativeHandle(ref, () => ({
    addBoundaryLayer(id, geojson, color) {
      const map = mapRef.current;
      if (!map) return;

      const fillId = `${id}-fill`;
      const lineId = `${id}-line`;
      const hFillId = `lookup-${id}-fill`;
      const hLineId = `lookup-${id}-line`;
      // Remove lookup highlight layers first — they reference the same source and
      // Mapbox won't allow removeSource while any layer still uses it.
      if (map.getLayer(hFillId)) map.removeLayer(hFillId);
      if (map.getLayer(hLineId)) map.removeLayer(hLineId);
      lookupHighlightIds.current = lookupHighlightIds.current.filter((h) => h !== `lookup-${id}`);
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(id)) map.removeSource(id);

      // Always insert boundary layers below the point layer so points stay on top
      const beforeLayer = map.getLayer('uploaded-points') ? 'uploaded-points' : undefined;

      map.addSource(id, { type: 'geojson', data: geojson });
      map.addLayer({
        id: fillId,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.1,
        },
      }, beforeLayer);
      map.addLayer({
        id: lineId,
        type: 'line',
        source: id,
        paint: {
          'line-color': color,
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      }, beforeLayer);
      addedLayers.current.add(id);
    },

    removeBoundaryLayer(id) {
      const map = mapRef.current;
      if (!map) return;
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

      // Remove previous listeners before removing the layer
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

      // Build a match expression so each batch gets its own color
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

      // Reuse or create a single popup instance
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
    },

    fitBounds(bbox) {
      const map = mapRef.current;
      if (!map) return;
      const [west, south, east, north] = bbox;
      map.fitBounds([[west, south], [east, north]], { padding: 60, maxZoom: 14 });
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
      for (const id of addedLayers.current) {
        if (map.getLayer(`${id}-fill`)) {
          map.setLayoutProperty(`${id}-fill`, 'visibility', 'visible');
          map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.1);  // clear any choropleth
        }
        if (map.getLayer(`${id}-line`)) map.setLayoutProperty(`${id}-line`, 'visibility', 'visible');
      }
    },

    setChoropleth(layerId, districtCounts, districtField, layerColor, stateField) {
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
          if (name.includes(' – ')) {
            const abbr = name.split(' – ')[0];
            const districtName = name.split(' – ').slice(1).join(' – ');
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
        if (stateField && displayName.includes(' – ')) {
          const abbr = displayName.split(' – ')[0];
          const districtName = displayName.split(' – ').slice(1).join(' – ');
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
  }));

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

export default MapView;
