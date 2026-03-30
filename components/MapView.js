import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';

function buildPopupHTML(properties) {
  const skip = new Set(['_rowIndex', '_globalIndex', '_batchId', '_geocodeConfidence', 'lat', 'lng']);
  const rows = Object.entries(properties)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `
      <tr>
        <td style="padding:3px 8px 3px 0;color:#7a8fa6;white-space:nowrap;vertical-align:top;font-size:11px">${k}</td>
        <td style="padding:3px 0;font-weight:600;color:#1c3557;font-size:12px;word-break:break-word">${v ?? ''}</td>
      </tr>`)
    .join('');
  return `<div style="max-height:240px;overflow-y:auto;font-family:'Open Sans',sans-serif">
    <table style="border-collapse:collapse;width:100%">${rows}</table>
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
      const fillId = `${id}-fill`;
      const lineId = `${id}-line`;
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
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
        if (map.getLayer(`${id}-fill`)) map.setLayoutProperty(`${id}-fill`, 'visibility', 'visible');
        if (map.getLayer(`${id}-line`)) map.setLayoutProperty(`${id}-line`, 'visibility', 'visible');
      }
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
