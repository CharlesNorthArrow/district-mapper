import Head from 'next/head';
import { useState, useRef, useCallback } from 'react';
import MapView from '../components/MapView';
import LayerPanel from '../components/LayerPanel';
import UploadModal from '../components/UploadModal';
import AnalysisPanel from '../components/AnalysisPanel';

const LAYER_COLORS = {
  congressional: '#e63947',
  'us-senate': '#1c3557',
  'state-senate': '#467c9d',
  'state-house': '#a9dadc',
  'school-unified': '#6a4c93',
  'school-elementary': '#f4a261',
  'school-secondary': '#2a9d8f',
};

export default function Home() {
  const mapRef = useRef(null);
  const [activeLayers, setActiveLayers] = useState([]);
  const [uploadedData, setUploadedData] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [layerGeojson, setLayerGeojson] = useState({});
  const [loadingLayer, setLoadingLayer] = useState(null);

  function removeLayer(layerId) {
    setActiveLayers((prev) => prev.filter((id) => id !== layerId));
    setLayerGeojson((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
    mapRef.current?.removeBoundaryLayer(layerId);
  }

  async function fetchAndAddLayer(layerId, url, color) {
    setLoadingLayer(layerId);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        alert(`Could not load ${layerId}: ${data.error || res.statusText}`);
        return;
      }
      mapRef.current?.addBoundaryLayer(layerId, data, color);
      setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
      setLayerGeojson((prev) => ({ ...prev, [layerId]: data }));
    } catch (err) {
      alert(`Could not load ${layerId}: ${err.message}`);
    } finally {
      setLoadingLayer(null);
    }
  }

  // National layers (congressional, us-senate) — no stateFips needed
  const handleLayerToggle = useCallback(async (layerId, enabled) => {
    if (!enabled) { removeLayer(layerId); return; }
    await fetchAndAddLayer(layerId, `/api/boundaries?layer=${layerId}`, LAYER_COLORS[layerId] || '#467c9d');
  }, []);

  // State layers (state-senate, state-house, school-*) — require stateFips
  const handleStateLayerToggle = useCallback(async (layerId, enabled, stateFips) => {
    if (!enabled) { removeLayer(layerId); return; }
    await fetchAndAddLayer(layerId, `/api/boundaries?layer=${layerId}&stateFips=${stateFips}`, LAYER_COLORS[layerId] || '#467c9d');
  }, []);

  const handleCityLayerToggle = useCallback(async (citySlug, enabled, bbox) => {
    const layerId = `council-${citySlug}`;
    if (!enabled) { removeLayer(layerId); return; }
    await fetchAndAddLayer(layerId, `/api/city-councils?city=${citySlug}&bbox=${bbox}`, '#e63947');
  }, []);

  const handleCustomLayer = useCallback((layerId, geojson) => {
    mapRef.current?.addBoundaryLayer(layerId, geojson, '#6a4c93');
    setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
    setLayerGeojson((prev) => ({ ...prev, [layerId]: geojson }));
  }, []);

  const handleUploadComplete = useCallback((points, originalRows, headers) => {
    setUploadedData({ points, originalRows, headers });
    setShowUploadModal(false);
    mapRef.current?.addPointLayer(points);
    if (points.length > 0) {
      const lngs = points.map((p) => p.lng);
      const lats = points.map((p) => p.lat);
      mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
    }
  }, []);

  return (
    <>
      <Head>
        <title>District Mapper — North Arrow</title>
        <meta name="description" content="Legislative boundary analysis tool for nonprofits" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
        <LayerPanel
          activeLayers={activeLayers}
          loadingLayer={loadingLayer}
          onLayerToggle={handleLayerToggle}
          onStateLayerToggle={handleStateLayerToggle}
          onCityLayerToggle={handleCityLayerToggle}
          onCustomLayer={handleCustomLayer}
          onUploadClick={() => setShowUploadModal(true)}
          hasData={!!uploadedData}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapView ref={mapRef} />
          {uploadedData && (
            <AnalysisPanel
              uploadedData={uploadedData}
              activeLayers={activeLayers}
              layerGeojson={layerGeojson}
            />
          )}
        </div>
      </div>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </>
  );
}
