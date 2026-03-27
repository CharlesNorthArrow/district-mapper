import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import MapView from '../components/MapView';
import LayerPanel from '../components/LayerPanel';
import UploadModal from '../components/UploadModal';
import AnalysisPanel from '../components/AnalysisPanel';
import Legend from '../components/Legend';
import TourOverlay from '../components/TourOverlay';
import { assignDistricts } from '../lib/pointInDistrict';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { suggestGeographies } from '../lib/geoSuggest';
import { LAYER_COLORS, DEFAULT_LAYER_COLOR, CUSTOM_COLOR_POOL } from '../lib/layerColors';
import { STATE_FIPS } from '../lib/stateFips';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';

const tourBtnStyle = {
  position: 'absolute',
  top: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5,
  background: 'rgba(255,255,255,0.93)',
  border: '1px solid #dde3ea',
  borderRadius: 20,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: '#1c3557',
  fontFamily: "'Open Sans', sans-serif",
  cursor: 'pointer',
  boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
  whiteSpace: 'nowrap',
};

export default function Home() {
  const mapRef = useRef(null);
  const customColorIndexRef = useRef(0);
  const [activeLayers, setActiveLayers] = useState([]);
  const [layerColors, setLayerColors] = useState({});
  const [uploadedData, setUploadedData] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [layerGeojson, setLayerGeojson] = useState({});
  const [loadingLayer, setLoadingLayer] = useState(null);
  const [enrichedPoints, setEnrichedPoints] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [geoSuggestions, setGeoSuggestions] = useState(null);
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [lookupLabel, setLookupLabel] = useState('');
  const [lookupDistricts, setLookupDistricts] = useState({});
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!uploadedData) return;
    setEnrichedPoints(assignDistricts(uploadedData.points, layerGeojson));
  }, [uploadedData, layerGeojson]);

  function handleGeographySelect(bbox) {
    mapRef.current?.fitBounds(bbox);
  }

  function featureBbox(feature) {
    const coords = [];
    function collect(geom) {
      if (!geom) return;
      if (geom.type === 'Point') { coords.push(geom.coordinates); return; }
      if (geom.type === 'MultiPoint' || geom.type === 'LineString') { coords.push(...geom.coordinates); return; }
      if (geom.type === 'MultiLineString' || geom.type === 'Polygon') { geom.coordinates.forEach((r) => coords.push(...r)); return; }
      if (geom.type === 'MultiPolygon') { geom.coordinates.forEach((poly) => poly.forEach((r) => coords.push(...r))); return; }
      if (geom.type === 'GeometryCollection') { geom.geometries.forEach(collect); }
    }
    collect(feature.geometry);
    if (!coords.length) return null;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }

  function getDistrictBbox(layerId, districtName, matchedPoints) {
    const geojson = layerGeojson[layerId];
    if (!geojson?.features?.length) return null;

    const config = LAYER_CONFIG[layerId];
    const citySlug = layerId.startsWith('council-') ? layerId.slice('council-'.length) : null;
    const cityConfig = citySlug ? CITY_COUNCIL_REGISTRY[citySlug] : null;
    const field = config?.districtField ?? cityConfig?.districtField;

    // District names for multi-state layers are prefixed "IL – 1"; strip to match feature properties
    const rawName = districtName.includes(' – ') ? districtName.split(' – ')[1] : districtName;

    const candidates = geojson.features.filter((f) => {
      const name = field
        ? (f.properties[field] ?? f.properties.NAME ?? f.properties.name)
        : (f.properties.NAME ?? f.properties.name);
      return String(name) === String(rawName);
    });

    if (!candidates.length) return null;

    // With multiple candidates (e.g., district "1" in multiple states), pick the one
    // whose bbox contains the most matched points
    let bestFeature = candidates[0];
    if (candidates.length > 1 && matchedPoints?.length) {
      let bestCount = -1;
      for (const candidate of candidates) {
        const bbox = featureBbox(candidate);
        if (!bbox) continue;
        const [w, s, e, n] = bbox;
        const count = matchedPoints.filter((p) => p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n).length;
        if (count > bestCount) {
          bestCount = count;
          bestFeature = candidate;
        }
      }
    }

    return featureBbox(bestFeature);
  }

  function handleDistrictSelect(layerId, districtName) {
    if (selectedDistrict?.layerId === layerId && selectedDistrict?.districtName === districtName) {
      setSelectedDistrict(null);
      mapRef.current?.clearPointFilter();
      if (uploadedData?.points.length > 0) {
        const lngs = uploadedData.points.map((p) => p.lng);
        const lats = uploadedData.points.map((p) => p.lat);
        mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
      }
    } else {
      const matching = enrichedPoints.filter((p) => p[layerId] === districtName);
      setSelectedDistrict({ layerId, districtName });
      mapRef.current?.filterPoints(matching.map((p) => p._rowIndex));
      // Pass matched points so getDistrictBbox can disambiguate same-named districts across states
      const bbox = getDistrictBbox(layerId, districtName, matching);
      if (bbox) {
        mapRef.current?.fitBounds(bbox);
      } else if (matching.length > 0) {
        // Fall back to the bounding box of the matched points themselves
        const lngs = matching.map((p) => p.lng);
        const lats = matching.map((p) => p.lat);
        mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
      }
    }
  }

  async function pinAndAssignDistricts(lat, lng, label) {
    mapRef.current?.addSearchPin(lng, lat);
    setLookupStatus('found');
    setLookupLabel(label);
    setLookupDistricts(null);
    try {
      const res = await fetch(`/api/district-lookup?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        setLookupDistricts(await res.json());
      } else {
        setLookupDistricts({});
      }
    } catch {
      setLookupDistricts({});
    }
  }

  async function handleAddressLookup(address) {
    if (!address.trim()) return;
    setLookupStatus('loading');
    setLookupLabel('');
    setLookupDistricts({});
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: [address] }),
      });
      if (!res.ok) throw new Error('Geocoding request failed');
      const [result] = await res.json();
      if (!result?.lat) {
        setLookupStatus('error');
        setLookupLabel('Address not found');
        return;
      }
      pinAndAssignDistricts(result.lat, result.lng, result.address || address);
    } catch {
      setLookupStatus('error');
      setLookupLabel('Geocoding failed — check your connection');
    }
  }

  function handleAddressSelect(lat, lng, label) {
    setLookupDistricts({});
    pinAndAssignDistricts(lat, lng, label);
  }

  function removeLayer(layerId) {
    setActiveLayers((prev) => prev.filter((id) => id !== layerId));
    setLayerGeojson((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
    setLayerColors((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
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
      setLayerColors((prev) => ({ ...prev, [layerId]: color }));
    } catch (err) {
      alert(`Could not load ${layerId}: ${err.message}`);
    } finally {
      setLoadingLayer(null);
    }
  }

  // National layers — no stateFips needed
  const handleLayerToggle = useCallback(async (layerId, enabled) => {
    if (!enabled) { removeLayer(layerId); return; }
    await fetchAndAddLayer(layerId, `/api/boundaries?layer=${layerId}`, LAYER_COLORS[layerId] || DEFAULT_LAYER_COLOR);
  }, []);

  // State layers — fipsArray may contain multiple states; fetch in parallel and merge
  const handleStateLayerToggle = useCallback(async (layerId, enabled, fipsArray) => {
    if (!enabled || !fipsArray?.length) { removeLayer(layerId); return; }
    const color = LAYER_COLORS[layerId] || DEFAULT_LAYER_COLOR;
    setLoadingLayer(layerId);
    try {
      const results = await Promise.all(
        fipsArray.map(async (fips) => {
          const res = await fetch(`/api/boundaries?layer=${layerId}&stateFips=${fips}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || res.statusText);
          return data;
        })
      );
      const merged = {
        type: 'FeatureCollection',
        features: results.flatMap((r) => r.features || []),
      };
      mapRef.current?.addBoundaryLayer(layerId, merged, color);
      setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
      setLayerGeojson((prev) => ({ ...prev, [layerId]: merged }));
      setLayerColors((prev) => ({ ...prev, [layerId]: color }));
    } catch (err) {
      alert(`Could not load ${layerId}: ${err.message}`);
    } finally {
      setLoadingLayer(null);
    }
  }, []);

  const handleCityLayerToggle = useCallback(async (citySlug, enabled) => {
    const layerId = `council-${citySlug}`;
    if (!enabled) { removeLayer(layerId); return; }
    const color = LAYER_COLORS[layerId] || DEFAULT_LAYER_COLOR;
    await fetchAndAddLayer(layerId, `/api/city-councils?city=${citySlug}`, color);
  }, []);

  const handleCustomLayer = useCallback((layerId, geojson) => {
    const color = CUSTOM_COLOR_POOL[customColorIndexRef.current % CUSTOM_COLOR_POOL.length];
    customColorIndexRef.current += 1;
    mapRef.current?.addBoundaryLayer(layerId, geojson, color);
    setActiveLayers((prev) => [...prev.filter((id) => id !== layerId), layerId]);
    setLayerGeojson((prev) => ({ ...prev, [layerId]: geojson }));
    setLayerColors((prev) => ({ ...prev, [layerId]: color }));
  }, []);

  const handleUploadComplete = useCallback((points, originalRows, headers, geos) => {
    setUploadedData({ points, originalRows, headers });
    setShowUploadModal(false);
    // Pass suggestions to LayerPanel so its state/city selectors reflect what was detected
    setGeoSuggestions(suggestGeographies(points));
    mapRef.current?.addPointLayer(points);
    if (points.length > 0) {
      const lngs = points.map((p) => p.lng);
      const lats = points.map((p) => p.lat);
      mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
    }
    if (!geos) return;
    // National layers
    if (geos.congressional) handleLayerToggle('congressional', true);
    if (geos['us-senate']) handleLayerToggle('us-senate', true);
    // Per-state layers (each is an array of state names)
    for (const layerId of ['state-senate', 'state-house', 'school-unified', 'school-elementary', 'school-secondary']) {
      const states = geos[layerId] ?? [];
      if (states.length > 0) {
        const fipsArray = states.map((s) => STATE_FIPS[s]).filter(Boolean);
        if (fipsArray.length > 0) handleStateLayerToggle(layerId, true, fipsArray);
      }
    }
    // City council layers
    for (const slug of (geos.cities ?? [])) {
      handleCityLayerToggle(slug, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          geoSuggestions={geoSuggestions}
          onAddressLookup={handleAddressLookup}
          onAddressSelect={handleAddressSelect}
          lookupStatus={lookupStatus}
          lookupLabel={lookupLabel}
          lookupDistricts={lookupDistricts}
          onGeographySelect={handleGeographySelect}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapView ref={mapRef} />
          <Legend activeLayers={activeLayers} layerColors={layerColors} />
          <button
            style={tourBtnStyle}
            onClick={() => setShowTour(true)}
          >
            ? How does this work
          </button>
          {uploadedData && (
            <AnalysisPanel
              uploadedData={uploadedData}
              enrichedPoints={enrichedPoints}
              activeLayers={activeLayers}
              layerGeojson={layerGeojson}
              selectedDistrict={selectedDistrict}
              onDistrictSelect={handleDistrictSelect}
              onLayerIsolate={(layerId) => {
                if (layerId) {
                  mapRef.current?.isolateLayer(layerId);
                } else {
                  mapRef.current?.showAllLayers();
                }
              }}
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

      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}
    </>
  );
}
