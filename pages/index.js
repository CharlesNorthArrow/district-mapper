import Head from 'next/head';
import { useState, useRef, useCallback } from 'react';
import MapView from '../components/MapView';
import LayerPanel from '../components/LayerPanel';
import UploadModal from '../components/UploadModal';
import AnalysisPanel from '../components/AnalysisPanel';

export default function Home() {
  const mapRef = useRef(null);
  const [activeLayers, setActiveLayers] = useState([]);
  const [uploadedData, setUploadedData] = useState(null); // { points, originalRows, headers }
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentBbox, setCurrentBbox] = useState(null);
  // layerGeojson: { [layerId]: FeatureCollection } — kept in state so AnalysisPanel can use it
  const [layerGeojson, setLayerGeojson] = useState({});

  const handleBboxChange = useCallback((bbox) => {
    setCurrentBbox(bbox);
  }, []);

  const handleLayerToggle = useCallback(async (layerId, enabled) => {
    if (!enabled) {
      setActiveLayers((prev) => prev.filter((id) => id !== layerId));
      setLayerGeojson((prev) => {
        const next = { ...prev };
        delete next[layerId];
        return next;
      });
      mapRef.current?.removeBoundaryLayer(layerId);
      return;
    }

    // Fetch boundary GeoJSON via our proxy
    const bbox = currentBbox || '-180,-90,180,90';
    const res = await fetch(`/api/boundaries?layer=${layerId}&bbox=${bbox}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`Failed to load layer ${layerId}:`, err.error || res.statusText);
      alert(`Could not load ${layerId}: ${err.error || res.statusText}`);
      return;
    }
    const geojson = await res.json();
    const layerColors = {
      congressional: '#e63947',
      'us-senate': '#1c3557',
      'state-senate': '#467c9d',
      'state-house': '#a9dadc',
      'school-unified': '#6a4c93',
      'school-elementary': '#f4a261',
      'school-secondary': '#2a9d8f',
    };
    const color = layerColors[layerId] || '#467c9d';
    mapRef.current?.addBoundaryLayer(layerId, geojson, color);
    setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
    setLayerGeojson((prev) => ({ ...prev, [layerId]: geojson }));
  }, [currentBbox]);

  const handleCityLayerToggle = useCallback(async (citySlug, enabled) => {
    const layerId = `council-${citySlug}`;
    if (!enabled) {
      setActiveLayers((prev) => prev.filter((id) => id !== layerId));
      setLayerGeojson((prev) => {
        const next = { ...prev };
        delete next[layerId];
        return next;
      });
      mapRef.current?.removeBoundaryLayer(layerId);
      return;
    }

    const bbox = currentBbox || '-180,-90,180,90';
    const res = await fetch(`/api/city-councils?city=${citySlug}&bbox=${bbox}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Could not load council districts for ${citySlug}: ${err.error || res.statusText}`);
      return;
    }
    const geojson = await res.json();
    mapRef.current?.addBoundaryLayer(layerId, geojson, '#e63947');
    setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
    setLayerGeojson((prev) => ({ ...prev, [layerId]: geojson }));
  }, [currentBbox]);

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
      mapRef.current?.fitBounds([
        Math.min(...lngs), Math.min(...lats),
        Math.max(...lngs), Math.max(...lats),
      ]);
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
          onLayerToggle={handleLayerToggle}
          onCityLayerToggle={handleCityLayerToggle}
          onCustomLayer={handleCustomLayer}
          onUploadClick={() => setShowUploadModal(true)}
          hasData={!!uploadedData}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapView
            ref={mapRef}
            onBboxChange={handleBboxChange}
          />

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
