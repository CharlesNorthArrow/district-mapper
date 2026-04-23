import Head from 'next/head';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import MapView from '../components/MapView';
import LayerPanel from '../components/LayerPanel';
import UploadModal from '../components/UploadModal';
import AnalysisPanel from '../components/AnalysisPanel';
import Legend from '../components/Legend';
import TourOverlay from '../components/TourOverlay';
import ProcessingBar from '../components/ProcessingBar';
import OverflowBanner from '../components/OverflowBanner';
import UpgradeModal from '../components/UpgradeModal';
import { assignDistricts } from '../lib/pointInDistrict';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { suggestGeographies, STATE_BBOX } from '../lib/geoSuggest';

// Return all state names whose bounding box contains at least one of the given points.
// Used to auto-select states in the sidebar after upload.
function detectStatesFromPoints(points) {
  const detected = [];
  for (const [stateName, bbox] of Object.entries(STATE_BBOX)) {
    if (!bbox) continue;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const hit = points.some(
      (p) => p.lng >= minLng && p.lng <= maxLng && p.lat >= minLat && p.lat <= maxLat
    );
    if (hit) detected.push(stateName);
  }
  return detected;
}
import { LAYER_COLORS, DEFAULT_LAYER_COLOR, CUSTOM_COLOR_POOL } from '../lib/layerColors';
import { STATE_FIPS } from '../lib/stateFips';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { getTier, setTier } from '../lib/getTier';
import { isLayerLocked } from '../lib/tierConfig';

// Colors for successive program data batches
const BATCH_COLORS = ['#e63947', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

const mapLoadingBadge = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  background: 'rgba(28,53,87,0.92)',
  color: '#fff',
  padding: '7px 16px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "'Open Sans', sans-serif",
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  whiteSpace: 'nowrap',
};

const tourBtnStyle = {
  position: 'absolute',
  top: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5,
  background: '#f5a800',
  border: 'none',
  borderRadius: 20,
  padding: '6px 16px',
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  fontFamily: "'Open Sans', sans-serif",
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(245,168,0,0.45)',
  whiteSpace: 'nowrap',
  animation: 'breathe 3s ease-in-out infinite',
};

export default function Home() {
  const mapRef = useRef(null);
  const customColorIndexRef = useRef(0);
  const uploadModeRef = useRef('overwrite');
  const hiddenBatchesRef = useRef(new Set());
  const activeLayersRef = useRef([]);
  const tierRef = useRef(getTier());
  const [activeLayers, setActiveLayers] = useState([]);
  const [layerColors, setLayerColors] = useState({});
  const [dataBatches, setDataBatches] = useState([]);   // [{ id, label, points, originalRows, headers, color }]
  const [hiddenBatches, setHiddenBatches] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [layerGeojson, setLayerGeojson] = useState({});
  const [loadingLayer, setLoadingLayer] = useState(null);
  const [enrichedPoints, setEnrichedPoints] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [geoSuggestions, setGeoSuggestions] = useState(null);
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [lookupLabel, setLookupLabel] = useState('');
  const [lookupDistricts, setLookupDistricts] = useState({});
  const [showTour, setShowTour] = useState(() => {
    try { return localStorage.getItem('dm_tour_dismissed') !== '1'; } catch { return true; }
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [tier, setTierState] = useState(() => getTier());
  const [overflowCount, setOverflowCount] = useState(0);
  const [showOverflowBanner, setShowOverflowBanner] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null); // null | { phase, done, total }
  const [activeChoroLayer, setActiveChoroLayer] = useState(null);
  const [savedPolicies, setSavedPolicies] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dm_saved_policies') || '[]'); } catch { return []; }
  });

  function handleSavePolicyScan({ districtName, layerId, mission, bills }) {
    const scan = { id: Date.now(), districtName, layerId, mission, bills,
                   savedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) };
    const updated = [scan, ...savedPolicies].slice(0, 10);
    setSavedPolicies(updated);
    try { localStorage.setItem('dm_saved_policies', JSON.stringify(updated)); } catch {}
  }

  function handleDeletePolicyScan(id) {
    const updated = savedPolicies.filter(s => s.id !== id);
    setSavedPolicies(updated);
    try { localStorage.setItem('dm_saved_policies', JSON.stringify(updated)); } catch {}
  }

  // Per-layer matched point counts — used for layer panel badges and analysis panel overview
  const layerCounts = useMemo(() => {
    if (enrichedPoints.length === 0) return {};
    const counts = {};
    for (const layerId of activeLayers) {
      counts[layerId] = enrichedPoints.filter((p) => p[layerId] != null).length;
    }
    return counts;
  }, [enrichedPoints, activeLayers]);

  function getDistrictField(layerId) {
    if (LAYER_CONFIG[layerId]) return { districtField: LAYER_CONFIG[layerId].districtField, stateField: LAYER_CONFIG[layerId].stateField };
    if (layerId.startsWith('council-')) {
      const slug = layerId.slice('council-'.length);
      const city = CITY_COUNCIL_REGISTRY[slug];
      return { districtField: city?.districtField || 'NAME', stateField: null };
    }
    return { districtField: 'NAME', stateField: null };
  }

  function buildChoroData(layerId) {
    const { districtField, stateField } = getDistrictField(layerId);
    const color = layerColors[layerId] || DEFAULT_LAYER_COLOR;
    const counts = {};
    for (const p of enrichedPoints) {
      if (p[layerId] != null) counts[p[layerId]] = (counts[p[layerId]] || 0) + 1;
    }
    // For label display, strip state prefix so it matches GeoJSON feature names
    const plainCounts = {};
    for (const [name, count] of Object.entries(counts)) {
      const plain = name.includes(' – ') ? name.split(' – ').slice(1).join(' – ') : name;
      plainCounts[plain] = (plainCounts[plain] || 0) + count;
    }
    return { counts, plainCounts, districtField, stateField, color };
  }

  function handleChoroLayerSelect(layerId) {
    const isDeselect = layerId === activeChoroLayer;

    // Always restore all layers first, then remove any existing labels
    mapRef.current?.showAllLayers();
    if (activeChoroLayer) mapRef.current?.removeCountLabels(activeChoroLayer);

    if (isDeselect) {
      setActiveChoroLayer(null);
      return;
    }

    setActiveChoroLayer(layerId);

    // Isolate the selected layer, apply choropleth and count labels
    mapRef.current?.isolateLayer(layerId);
    const { counts, plainCounts, districtField, stateField, color } = buildChoroData(layerId);
    const geojson = layerGeojson[layerId];
    mapRef.current?.setChoropleth(layerId, counts, districtField, color, stateField);
    if (geojson) mapRef.current?.addCountLabels(layerId, geojson, plainCounts, districtField);
  }

  // Keep choropleth and labels in sync when enrichedPoints updates
  useEffect(() => {
    if (!activeChoroLayer || enrichedPoints.length === 0) return;
    const { counts, plainCounts, districtField, stateField, color } = buildChoroData(activeChoroLayer);
    const geojson = layerGeojson[activeChoroLayer];
    mapRef.current?.setChoropleth(activeChoroLayer, counts, districtField, color, stateField);
    if (geojson) {
      mapRef.current?.removeCountLabels(activeChoroLayer);
      mapRef.current?.addCountLabels(activeChoroLayer, geojson, plainCounts, districtField);
    }
  }, [enrichedPoints, activeChoroLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUnlock(newTier) {
    setTier(newTier);
    setTierState(newTier);
  }

  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);
  useEffect(() => { tierRef.current = tier; }, [tier]);

  useEffect(() => {
    if (dataBatches.length === 0) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      const allPoints = dataBatches.flatMap((b) => b.points);
      setProcessingStatus({ phase: 'Analyzing districts', done: 0, total: allPoints.length });

      const result = await assignDistricts(allPoints, layerGeojson, (done, total) => {
        if (!cancelled) setProcessingStatus({ phase: 'Analyzing districts', done, total });
      });

      if (!cancelled) {
        setEnrichedPoints(result);
        setProcessingStatus(null);
      }
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [dataBatches, layerGeojson]);

  // Highlight the matched district polygons on the map whenever lookup results arrive
  useEffect(() => {
    if (!lookupDistricts || Object.keys(lookupDistricts).length === 0) {
      mapRef.current?.clearLookupHighlights();
      return;
    }
    const highlights = Object.entries(lookupDistricts)
      .filter(([layerId]) => activeLayers.includes(layerId) && layerGeojson[layerId])
      .map(([layerId, displayName]) => {
        const cfg = LAYER_CONFIG[layerId];
        return { layerId, displayName, districtField: cfg?.districtField || 'NAME', stateField: cfg?.stateField || null };
      });
    mapRef.current?.setLookupHighlights(highlights);
  }, [lookupDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const allPoints = dataBatches.flatMap((b) => b.points);
      if (allPoints.length > 0) {
        const lngs = allPoints.map((p) => p.lng);
        const lats = allPoints.map((p) => p.lat);
        mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
      }
    } else {
      const matching = enrichedPoints.filter((p) => p[layerId] === districtName);
      setSelectedDistrict({ layerId, districtName });
      mapRef.current?.filterPoints(matching.map((p) => p._globalIndex));
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

  function toggleBatchVisibility(batchId) {
    setHiddenBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      hiddenBatchesRef.current = next;
      const visibleBatches = dataBatches.filter((b) => !next.has(b.id));
      const batchColors = Object.fromEntries(visibleBatches.map((b) => [b.id, b.color]));
      mapRef.current?.setPointLayer(visibleBatches.flatMap((b) => b.points), batchColors);
      return next;
    });
  }

  function handleLookupClear() {
    setLookupStatus('idle');
    setLookupLabel('');
    setLookupDistricts({});
    mapRef.current?.clearSearchPin();
    mapRef.current?.clearLookupHighlights();
  }

  function removeLayer(layerId) {
    if (layerId === activeChoroLayer) {
      setActiveChoroLayer(null);
      mapRef.current?.showAllLayers();
    }
    setActiveLayers((prev) => prev.filter((id) => id !== layerId));
    setLayerGeojson((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
    setLayerColors((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
    mapRef.current?.removeBoundaryLayer(layerId); // also cleans up count labels
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
    if (isLayerLocked(layerId, tierRef.current)) return;
    await fetchAndAddLayer(layerId, `/api/boundaries?layer=${layerId}`, LAYER_COLORS[layerId] || DEFAULT_LAYER_COLOR);
  }, []);

  // State layers — fipsArray may contain multiple states; fetch in parallel and merge
  const handleStateLayerToggle = useCallback(async (layerId, enabled, fipsArray) => {
    if (!enabled || !fipsArray?.length) { removeLayer(layerId); return; }
    if (isLayerLocked(layerId, tierRef.current)) return;
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
    if (isLayerLocked(layerId, tierRef.current)) return;
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

  const handleUploadComplete = useCallback((points, originalRows, headers, geos, title, overflow) => {
    const isAdd = uploadModeRef.current === 'add';

    setShowOverflowBanner(false);
    if (overflow > 0) {
      setOverflowCount(overflow);
      setShowOverflowBanner(true);
    }

    if (!isAdd) {
      hiddenBatchesRef.current = new Set();
      setHiddenBatches(new Set());
    }

    setDataBatches((prevBatches) => {
      const batchIndex = isAdd ? prevBatches.length : 0;
      const globalOffset = isAdd ? prevBatches.reduce((sum, b) => sum + b.points.length, 0) : 0;
      const batchId = `batch-${batchIndex}`;
      const color = BATCH_COLORS[batchIndex % BATCH_COLORS.length];
      const label = title || `Dataset ${batchIndex + 1}`;

      const taggedPoints = points.map((p, i) => ({
        ...p,
        _batchId: batchId,
        _globalIndex: globalOffset + i,
        _datasetLabel: label,
      }));

      const newBatch = { id: batchId, label, points: taggedPoints, originalRows, headers, color };
      const newBatches = isAdd ? [...prevBatches, newBatch] : [newBatch];

      // Update map point layer — respect any hidden batches
      const visibleBatches = newBatches.filter((b) => !hiddenBatchesRef.current.has(b.id));
      const batchColors = Object.fromEntries(visibleBatches.map((b) => [b.id, b.color]));
      mapRef.current?.setPointLayer(visibleBatches.flatMap((b) => b.points), batchColors);

      // Fit to the new batch's points
      if (taggedPoints.length > 0) {
        const lngs = taggedPoints.map((p) => p.lng);
        const lats = taggedPoints.map((p) => p.lat);
        mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
      }

      return newBatches;
    });

    setShowUploadModal(false);

    // Auto-select states in the sidebar based on where the uploaded points land
    if (!isAdd && points.length > 0) {
      const detectedStates = detectStatesFromPoints(points);
      if (detectedStates.length > 0) {
        setGeoSuggestions({ states: detectedStates, cities: [] });
      }
    }

    if (!geos) return;
    // Only load boundary layers on first upload or overwrite (not on add)
    if (!isAdd) {
      // Clear all existing boundary layers so unchecked layers don't linger from a previous upload
      for (const layerId of activeLayersRef.current) {
        mapRef.current?.removeBoundaryLayer(layerId);
      }
      setActiveLayers([]);
      setLayerGeojson({});
      setLayerColors({});
      if (geos.congressional) handleLayerToggle('congressional', true);
      if (geos['us-senate']) handleLayerToggle('us-senate', true);
      for (const layerId of ['counties', 'census-tracts', 'county-subdivisions', 'zcta', 'state-senate', 'state-house', 'school-unified', 'incorporated-places', 'school-elementary', 'school-secondary', 'opportunity-zones']) {
        const states = geos[layerId] ?? [];
        if (states.length > 0) {
          const fipsArray = states.map((s) => STATE_FIPS[s]).filter(Boolean);
          if (fipsArray.length > 0) handleStateLayerToggle(layerId, true, fipsArray);
        }
      }
      for (const slug of (geos.cities ?? [])) {
        handleCityLayerToggle(slug, true);
        for (const { slug: extraSlug } of CITY_COUNCIL_REGISTRY[slug]?.extraLayers || []) {
          handleCityLayerToggle(extraSlug, true);
        }
      }
    }

    // Tell LayerPanel only about the states/cities that were actually loaded so its
    // state selector reflects the checked choices and doesn't re-fetch extra layers
    const loadedStates = [];
    for (const layerId of ['counties', 'census-tracts', 'county-subdivisions', 'zcta', 'state-senate', 'state-house', 'school-unified', 'incorporated-places', 'school-elementary', 'school-secondary', 'opportunity-zones']) {
      for (const state of (geos[layerId] ?? [])) {
        if (!loadedStates.includes(state)) loadedStates.push(state);
      }
    }
    setGeoSuggestions({ states: loadedStates, cities: geos.cities ?? [] });
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
          onUploadClick={(mode) => { uploadModeRef.current = mode; setShowUploadModal(true); }}
          hasData={dataBatches.length > 0}
          dataBatches={dataBatches}
          hiddenBatches={hiddenBatches}
          onToggleBatch={toggleBatchVisibility}
          geoSuggestions={geoSuggestions}
          onAddressLookup={handleAddressLookup}
          onAddressSelect={handleAddressSelect}
          onLookupClear={handleLookupClear}
          lookupStatus={lookupStatus}
          lookupLabel={lookupLabel}
          lookupDistricts={lookupDistricts}
          onGeographySelect={handleGeographySelect}
          tier={tier}
          onUpgradeClick={() => setShowUpgradeModal(true)}
          layerCounts={layerCounts}
          layerColors={layerColors}
          activeChoroLayer={activeChoroLayer}
          onChoroLayerSelect={handleChoroLayerSelect}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapView ref={mapRef} />
          {processingStatus && <ProcessingBar status={processingStatus} />}
          {showOverflowBanner && (
            <OverflowBanner
              overflowCount={overflowCount}
              onUpgrade={() => { setShowOverflowBanner(false); setShowUpgradeModal(true); }}
              onDismiss={() => setShowOverflowBanner(false)}
            />
          )}
          <Legend activeLayers={activeLayers} layerColors={layerColors} dataBatches={dataBatches} />
          {loadingLayer && (
            <div style={mapLoadingBadge}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
              Loading {LAYER_CONFIG[loadingLayer]?.displayName || loadingLayer}…
            </div>
          )}
          <button
            style={tourBtnStyle}
            onClick={() => setShowTour(true)}
          >
            How does this work?
          </button>
          {dataBatches.length > 0 && (
            <AnalysisPanel
              uploadedData={{
                points: dataBatches.flatMap((b) => b.points),
                originalRows: dataBatches.flatMap((b) => b.originalRows),
                headers: dataBatches[0]?.headers ?? [],
              }}
              enrichedPoints={enrichedPoints}
              activeLayers={activeLayers}
              layerCounts={layerCounts}
              selectedDistrict={selectedDistrict}
              onDistrictSelect={handleDistrictSelect}
              activeChoroLayer={activeChoroLayer}
              onChoroLayerSelect={handleChoroLayerSelect}
              onFilteredIndicesChange={(indices) => {
                if (indices === null) {
                  mapRef.current?.clearPointFilter();
                } else {
                  mapRef.current?.filterPoints(indices);
                }
              }}
              tier={tier}
              onUpgradeClick={() => setShowUpgradeModal(true)}
              savedPolicies={savedPolicies}
              onSaveScan={handleSavePolicyScan}
              onDeletePolicyScan={handleDeletePolicyScan}
            />
          )}
        </div>
      </div>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
          tier={tier}
          onUnlock={handleUnlock}
          onOpenUpgrade={() => { setShowUploadModal(false); setShowUpgradeModal(true); }}
        />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onUnlock={handleUnlock}
        />
      )}

      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}
    </>
  );
}
