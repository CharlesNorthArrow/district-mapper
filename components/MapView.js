import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';

const MapView = forwardRef(function MapView(_, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const addedLayers = useRef(new Set());

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

      // Remove existing layers/source for this id if present
      const fillId = `${id}-fill`;
      const lineId = `${id}-line`;
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(id)) map.removeSource(id);

      map.addSource(id, { type: 'geojson', data: geojson });
      map.addLayer({
        id: fillId,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.1,
        },
      });
      map.addLayer({
        id: lineId,
        type: 'line',
        source: id,
        paint: {
          'line-color': color,
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      });
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

    addPointLayer(points) {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing point layer if present
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

      map.addSource('uploaded-points', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'uploaded-points',
        type: 'circle',
        source: 'uploaded-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#e63947',
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        },
      });
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
      map.setFilter('uploaded-points', ['in', ['get', '_rowIndex'], ['literal', indices]]);
    },

    clearPointFilter() {
      const map = mapRef.current;
      if (!map?.getLayer('uploaded-points')) return;
      map.setFilter('uploaded-points', null);
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
