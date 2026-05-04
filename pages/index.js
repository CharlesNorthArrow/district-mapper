import Head from 'next/head';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useUser, useClerk, SignInButton, UserButton } from '@clerk/nextjs';
import PreAuthModal from '../components/PreAuthModal';
import MapView from '../components/MapView';
import LayerPanel, { NATIONAL_LAYERS, STATE_LAYERS } from '../components/LayerPanel';
import UploadModal from '../components/UploadModal';
import AnalysisPanel from '../components/AnalysisPanel';
import Legend from '../components/Legend';
import TourOverlay from '../components/TourOverlay';
import ProcessingBar from '../components/ProcessingBar';
import OverflowBanner from '../components/OverflowBanner';
import UpgradeModal from '../components/UpgradeModal';
import ExportDialog from '../components/ExportDialog';
import { assignDistricts } from '../lib/pointInDistrict';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { suggestGeographies, STATE_BBOX, CITY_BBOX } from '../lib/geoSuggest';

// Return all state names whose bounding box contains at least one of the given points.
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

// Return city slugs (matching CITY_COUNCIL_REGISTRY keys) whose bounding box contains
// at least one of the given points. Used to auto-select cities in the Local section.
function detectCitiesFromPoints(points) {
  const detected = [];
  for (const [slug, bbox] of Object.entries(CITY_BBOX)) {
    if (!bbox) continue;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const hit = points.some(
      (p) => p.lng >= minLng && p.lng <= maxLng && p.lat >= minLat && p.lat <= maxLat
    );
    if (hit) detected.push(slug);
  }
  return detected;
}
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { LAYER_COLORS, DEFAULT_LAYER_COLOR, CUSTOM_COLOR_POOL } from '../lib/layerColors';
import { STATE_FIPS } from '../lib/stateFips';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { getTier, setTier } from '../lib/getTier';
import { isLayerLocked } from '../lib/tierConfig';

// Colors for successive program data batches
const BATCH_COLORS = ['#e63947', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];
const DEMO_COLOR = '#94a3b8';

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


const mapActionBtn = {
  width: 29, height: 29,
  background: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
  color: '#333',
};

export default function Home() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { openSignUp } = useClerk(); // kept for legacy paths

  function handleUpgradeClick() {
    if (!isSignedIn) { openPreAuth('Unlock this feature by creating a free account or subscribing to Pro.'); return; }
    setShowUpgradeModal(true);
  }
  const [preAuthContext, setPreAuthContext] = useState(null);
  const showPreAuthModal = preAuthContext !== null;
  function openPreAuth(context = '') { setPreAuthContext(context); }
  function closePreAuth() { setPreAuthContext(null); }
  const mapRef = useRef(null);
  const customColorIndexRef = useRef(0);
  const uploadModeRef = useRef('overwrite');
  const savedExtentRef = useRef(null);
  const hiddenBatchesRef = useRef(new Set());
  const activeLayersRef = useRef([]);
  const authProfileRef = useRef(null);
  const tierRef = useRef(getTier());
  const layerFipsRef = useRef({});
  const isSignedInRef = useRef(false);
  const [activeLayers, setActiveLayers] = useState([]);
  const [authProfile, setAuthProfile] = useState(null);
  const [layerColors, setLayerColors] = useState({});
  const [dataBatches, setDataBatches] = useState([]);   // [{ id, label, points, originalRows, headers, color }]
  const [hiddenBatches, setHiddenBatches] = useState(new Set());
  const [focusedBatchId, setFocusedBatchId] = useState(null); // null = all batches visible
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [tier, setTierState] = useState('free_anonymous');
  const [overflowCount, setOverflowCount] = useState(0);
  const [showOverflowBanner, setShowOverflowBanner] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null); // null | { phase, done, total }
  const [activeChoroLayer, setActiveChoroLayer] = useState(null);
  const [savedPolicies, setSavedPolicies] = useState([]);
  const [persistMsg, setPersistMsg] = useState(null); // { type: 'saving'|'saved'|'restored'|'error', text: string }
  const [suggestedLayerIds, setSuggestedLayerIds] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const multiSelectModeRef = useRef(false);

  // Read localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    try {
      setShowTour(localStorage.getItem('dm_tour_dismissed') !== '1');
      const policies = JSON.parse(localStorage.getItem('dm_saved_policies') || '[]');
      setSavedPolicies(policies);
      setTierState(getTier());
      const extent = JSON.parse(localStorage.getItem('dm_last_extent') || 'null');
      if (extent) savedExtentRef.current = extent;
    } catch {}
  }, []);

  // Load demo dataset on first visit (unless hidden or real data already loaded)
  function loadDemoDataset() {
    fetch('/demo-dataset.json')
      .then((r) => r.json())
      .then((rawPoints) => {
        const demoPoints = rawPoints.map((p, i) => ({
          ...p,
          _batchId: 'demo',
          _globalIndex: 1000000 + i,
          _datasetLabel: 'Demo Dataset',
        }));
        const demoBatch = {
          id: 'demo',
          label: 'Demo Dataset',
          points: demoPoints,
          originalRows: rawPoints,
          headers: Object.keys(rawPoints[0] || {}),
          color: DEMO_COLOR,
          isDemo: true,
        };
        setDataBatches((prev) => {
          if (prev.some((b) => !b.isDemo)) return prev;
          return [demoBatch];
        });
        const lngs = demoPoints.map((p) => p.lng);
        const lats = demoPoints.map((p) => p.lat);
        if (!isSignedInRef.current) {
          mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
        }
      })
      .catch(() => {});
  }

  function loadDefaultState() {
    setSelectedStates(['New York']);
    setSelectedCities(['nyc']);
  }

  // Always load demo dataset on mount (hidden by autoReloadDataset when real data exists)
  useEffect(() => {
    loadDemoDataset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Stripe redirect params: /?upgrade=success or /?upgrade=canceled
  useEffect(() => {
    const { upgrade, showUpgrade } = router.query;
    if (showUpgrade === 'true') {
      router.replace('/', undefined, { shallow: true });
      setShowUpgradeModal(true);
      return;
    }
    if (!upgrade) return;
    router.replace('/', undefined, { shallow: true });
    if (upgrade === 'success') {
      setPersistMsg({ type: 'saved', text: "You're now on Pro! All features are unlocked." });
      // Webhook may take 1–3s to fire — re-fetch tier after a short delay
      setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/me');
          const data = await res.json();
          if (data.tier === 'pro' || data.tier === 'enterprise') {
            setAuthProfile(data);
            setTierState(data.tier);
            tierRef.current = data.tier;
          }
        } catch {}
      }, 2000);
    } else if (upgrade === 'canceled') {
      setPersistMsg({ type: 'error', text: "Checkout was canceled — your plan hasn't changed." });
    }
  }, [router.query.upgrade, router.query.showUpgrade]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSavePolicyScan({ districtName, layerId, mission, bills }) {
    const scan = { id: Date.now(), districtName, layerId, mission, bills,
                   savedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) };
    const prev = Array.isArray(savedPolicies) ? savedPolicies : [];
    const updated = [scan, ...prev].slice(0, 10);
    setSavedPolicies(updated);
    try { localStorage.setItem('dm_saved_policies', JSON.stringify(updated)); } catch {}
  }

  function handleDeletePolicyScan(id) {
    const updated = savedPolicies.filter(s => s.id !== id);
    setSavedPolicies(updated);
    try { localStorage.setItem('dm_saved_policies', JSON.stringify(updated)); } catch {}
  }

  function handleDeleteBatch(batchId) {
    const remaining = dataBatches.filter(b => b.id !== batchId);
    setDataBatches(remaining);
    setHiddenBatches(prev => { const next = new Set(prev); next.delete(batchId); return next; });
    const visibleRemaining = remaining.filter(b => !hiddenBatches.has(b.id));
    const batchColors = Object.fromEntries(visibleRemaining.map(b => [b.id, b.color]));
    mapRef.current?.setPointLayer(visibleRemaining.flatMap(b => b.points), batchColors);
  }

  function handleHideDemo() {
    toggleBatchVisibility('demo');
  }

  function handleSelectedStatesChange(states) {
    setSelectedStates(states);
    if (isSignedInRef.current) {
      try { localStorage.setItem('dm_selected_states', JSON.stringify(states)); } catch {}
    }
  }

  function handleSelectedCitiesChange(cities) {
    setSelectedCities(cities);
    if (isSignedInRef.current) {
      try { localStorage.setItem('dm_selected_cities', JSON.stringify(cities)); } catch {}
    }
  }

  function toggleMultiSelectMode() {
    const wasMulti = multiSelectMode;
    multiSelectModeRef.current = !wasMulti;
    setMultiSelectMode(!wasMulti);

    if (wasMulti && activeLayers.length > 1) {
      // Keep only the most recently selected layer
      const keepLayer = activeLayers[activeLayers.length - 1];
      for (const layerId of activeLayers) {
        if (layerId !== keepLayer) removeLayer(layerId);
      }
      setActiveChoroLayer(keepLayer);
    }
  }

  async function handleSwitchLayer(newLayerId, type, fipsArray, citySlug) {
    for (const layerId of [...activeLayersRef.current]) {
      if (layerId !== newLayerId) removeLayer(layerId);
    }
    if (type === 'national') {
      await handleLayerToggle(newLayerId, true);
    } else if (type === 'state') {
      await handleStateLayerToggle(newLayerId, true, fipsArray);
    } else if (type === 'city') {
      await handleCityLayerToggle(citySlug, true);
    }
    setActiveChoroLayer(newLayerId);
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

  // Full list of layers currently available in the sidebar — mirrors National/State/Local sections
  const availableLayers = useMemo(() => {
    const ids = [...NATIONAL_LAYERS];
    if (selectedStates.length > 0) ids.push(...STATE_LAYERS);
    for (const slug of selectedCities) {
      ids.push(`council-${slug}`);
      for (const { slug: extraSlug } of CITY_COUNCIL_REGISTRY[slug]?.extraLayers || []) {
        ids.push(`council-${extraSlug}`);
      }
    }
    return ids;
  }, [selectedStates, selectedCities]);

  // All layer IDs that have at least one matched point — used by ExportDialog geographies step
  const matchedLayerIds = useMemo(() => {
    if (enrichedPoints.length === 0) return [];
    const csvHeaders = new Set(dataBatches.flatMap((b) => b.headers));
    const found = new Set();
    for (const p of enrichedPoints) {
      for (const key of Object.keys(p)) {
        if (!key.startsWith('_') && key !== 'lat' && key !== 'lng' && !csvHeaders.has(key) && p[key] != null) {
          found.add(key);
        }
      }
    }
    return [...found];
  }, [enrichedPoints, dataBatches]);

  function getDistrictField(layerId) {
    if (LAYER_CONFIG[layerId]) return { districtField: LAYER_CONFIG[layerId].districtField, stateField: LAYER_CONFIG[layerId].stateField };
    if (layerId.startsWith('council-')) {
      const slug = layerId.slice('council-'.length);
      const city = CITY_COUNCIL_REGISTRY[slug];
      return { districtField: city?.districtField || 'NAME', stateField: null };
    }
    return { districtField: 'NAME', stateField: null };
  }

  function buildChoroData(layerId, ptsOverride = null) {
    const { districtField, stateField } = getDistrictField(layerId);
    const color = layerColors[layerId] || DEFAULT_LAYER_COLOR;
    const pts = ptsOverride ?? enrichedPoints;
    const counts = {};
    for (const p of pts) {
      if (p[layerId] != null) counts[p[layerId]] = (counts[p[layerId]] || 0) + 1;
    }
    // For label display, strip state prefix so it matches GeoJSON feature names
    const plainCounts = {};
    for (const [name, count] of Object.entries(counts)) {
      const plain = name.replace(/^.+? [–-] /, '');
      plainCounts[plain] = (plainCounts[plain] || 0) + count;
    }
    return { counts, plainCounts, districtField, stateField, color };
  }

  function handleChoroLayerSelect(layerId) {
    const isDeselect = layerId === activeChoroLayer;

    // Always restore all layers first, then remove any existing labels
    mapRef.current?.showAllLayers();
    if (activeChoroLayer) {
      mapRef.current?.removeCountLabels(activeChoroLayer);
      mapRef.current?.clearBoundaryFilter(activeChoroLayer);
    }
    mapRef.current?.clearPointFilter();
    setSelectedDistrict(null);

    if (isDeselect) {
      setActiveChoroLayer(null);
      return;
    }

    setActiveChoroLayer(layerId);

    mapRef.current?.isolateLayer(layerId);
    const { counts, plainCounts, districtField, stateField, color } = buildChoroData(layerId);
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    mapRef.current?.setChoropleth(layerId, counts, districtField, color, stateField, plainCounts, total);
  }

  // Keep choropleth and labels in sync when enrichedPoints updates
  useEffect(() => {
    if (!activeChoroLayer || enrichedPoints.length === 0) return;
    const choroPts = focusedBatchId ? enrichedPoints.filter(p => p._batchId === focusedBatchId) : null;
    const { counts, plainCounts, districtField, stateField, color } = buildChoroData(activeChoroLayer, choroPts);
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    mapRef.current?.setChoropleth(activeChoroLayer, counts, districtField, color, stateField, plainCounts, total);
  }, [enrichedPoints, activeChoroLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync map point layer whenever batches or visibility changes (source of truth for the map)
  useEffect(() => {
    if (focusedBatchId) return; // focused-batch view handled below
    if (dataBatches.length === 0) return;
    const visibleBatches = dataBatches.filter(b => !hiddenBatches.has(b.id));
    const batchColors = Object.fromEntries(visibleBatches.map(b => [b.id, b.color]));
    mapRef.current?.setPointLayer(visibleBatches.flatMap(b => b.points), batchColors);
  }, [dataBatches, hiddenBatches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map points + choropleth when user clicks a batch tab in AnalysisPanel
  useEffect(() => {
    if (dataBatches.length === 0) return;
    if (focusedBatchId) {
      const batch = dataBatches.find(b => b.id === focusedBatchId);
      if (batch) mapRef.current?.setPointLayer(batch.points, { [batch.id]: batch.color });
    } else {
      const visibleBatches = dataBatches.filter(b => !hiddenBatches.has(b.id));
      const batchColors = Object.fromEntries(visibleBatches.map(b => [b.id, b.color]));
      mapRef.current?.setPointLayer(visibleBatches.flatMap(b => b.points), batchColors);
    }
    if (activeChoroLayer && enrichedPoints.length > 0) {
      const choroPts = focusedBatchId ? enrichedPoints.filter(p => p._batchId === focusedBatchId) : null;
      const { counts, plainCounts, districtField, stateField, color } = buildChoroData(activeChoroLayer, choroPts);
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      mapRef.current?.setChoropleth(activeChoroLayer, counts, districtField, color, stateField, plainCounts, total);
    }
  }, [focusedBatchId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUnlock(newTier) {
    setTier(newTier);
    setTierState(newTier);
  }

  function handleMapMoveEnd({ center, zoom }) {
    try { localStorage.setItem('dm_last_extent', JSON.stringify({ center, zoom })); } catch {}
  }

  const choroMax = useMemo(() => {
    if (!activeChoroLayer || enrichedPoints.length === 0) return 0;
    const pts = focusedBatchId ? enrichedPoints.filter(p => p._batchId === focusedBatchId) : enrichedPoints;
    const counts = {};
    for (const p of pts) {
      if (p[activeChoroLayer] != null) counts[p[activeChoroLayer]] = (counts[p[activeChoroLayer]] || 0) + 1;
    }
    return Math.max(...Object.values(counts), 0);
  }, [enrichedPoints, activeChoroLayer, focusedBatchId]);

  function handleSaveImage() {
    const layerDisplayNames = Object.fromEntries(
      activeLayers.map((id) => {
        if (LAYER_CONFIG[id]) return [id, LAYER_CONFIG[id].displayName];
        if (id.startsWith('council-')) {
          const slug = id.slice('council-'.length);
          const city = CITY_COUNCIL_REGISTRY[slug];
          return [id, city?.displayName || (city ? `${city.name} Council` : slug)];
        }
        if (id.startsWith('custom-')) return [id, id.slice('custom-'.length).replace(/-+/g, ' ')];
        return [id, id];
      })
    );
    mapRef.current?.captureImage({
      activeLayers,
      layerColors,
      dataBatches,
      choroLayer: activeChoroLayer,
      choroColor: activeChoroLayer ? (layerColors[activeChoroLayer] || DEFAULT_LAYER_COLOR) : null,
      choroMax,
      layerDisplayNames,
    });
  }

  function handleCopyShareLink() {
    try {
      const center = mapRef.current?.getCenter();
      const zoom = mapRef.current?.getZoom();

      // When a choropleth is active, all other layers are hidden (isolated).
      // Only encode what's actually visible.
      const visibleLayerIds = activeChoroLayer ? [activeChoroLayer] : activeLayers;

      const layers = visibleLayerIds.map((id) => {
        const color = layerColors[id];
        if (id.startsWith('council-')) {
          return { id, type: 'city', slug: id.slice('council-'.length), color };
        }
        const cfg = LAYER_CONFIG[id];
        if (cfg && (cfg.queryMode === 'byState' || cfg.queryMode === 'byBbox')) {
          return { id, type: 'state', fips: layerFipsRef.current[id] || [], color };
        }
        return { id, type: 'national', color };
      });

      // Choropleth — encode raw counts so preview can apply the same intensity
      let choro = null;
      if (activeChoroLayer) {
        const { counts, districtField, stateField, color } = buildChoroData(activeChoroLayer);
        choro = { layerId: activeChoroLayer, counts, districtField, stateField, color };
      }

      // Visible point batches — compact [lat, lng] pairs, capped at 5000 per batch
      const visibleBatches = dataBatches.filter((b) => !hiddenBatches.has(b.id));
      const pointBatches = visibleBatches.length > 0
        ? visibleBatches.map((b) => ({
            label: b.label,
            color: b.color,
            pts: b.points.slice(0, 5000).map((p) => [
              Math.round(p.lat * 10000) / 10000,
              Math.round(p.lng * 10000) / 10000,
            ]),
          }))
        : null;

      const state = {
        center: [center?.lng ?? -96, center?.lat ?? 38],
        zoom: zoom ?? 4,
        layers,
        choro,
        pointBatches,
      };
      // Unicode-safe base64: encodeURIComponent handles multi-byte chars, unescape maps to Latin1
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      const url = `${window.location.origin}/preview?s=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {
        // Clipboard API unavailable — fall back to prompt
        window.prompt('Copy this link:', url);
      });
    } catch (err) {
      console.error('[share] failed to build share link:', err);
      alert('Could not generate share link — see console for details.');
    }
  }

  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);

  // In multi-select mode, reset to overview when a new layer is added
  const prevLayerCountRef = useRef(0);
  useEffect(() => {
    const prev = prevLayerCountRef.current;
    prevLayerCountRef.current = activeLayers.length;
    if (multiSelectModeRef.current && activeLayers.length > prev && activeChoroLayer) {
      mapRef.current?.showAllLayers();
      setActiveChoroLayer(null);
    }
  }, [activeLayers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { tierRef.current = tier; }, [tier]);
  useEffect(() => {
    // Detect sign-out: if we were signed in and are now signed out, wipe all session data
    if (clerkLoaded && isSignedInRef.current && !isSignedIn) {
      // Clear React state
      setDataBatches([]);
      setEnrichedPoints([]);
      setActiveLayers([]);
      setLayerGeojson({});
      setLayerColors({});
      setActiveChoroLayer(null);
      setSelectedDistrict(null);
      setHiddenBatches(new Set());
      setAuthProfile(null);
      setSelectedStates([]);
      setSelectedCities([]);
      // Clear map visuals
      for (const layerId of activeLayersRef.current) {
        mapRef.current?.removeBoundaryLayer(layerId);
      }
      mapRef.current?.setPointLayer([], {});
      // Reset refs
      authProfileRef.current = null;
      activeLayersRef.current = [];
      hiddenBatchesRef.current = new Set();
      layerFipsRef.current = {};
      customColorIndexRef.current = 0;
      // Clear persisted geography preferences for this user
      try { localStorage.removeItem('dm_selected_states'); } catch {}
      try { localStorage.removeItem('dm_selected_cities'); } catch {}
      try { localStorage.removeItem('dm_last_extent'); } catch {}
      // Restore default non-logged-in state: demo dataset + NY + NYC
      loadDemoDataset();
      loadDefaultState();
    }
    isSignedInRef.current = !!isSignedIn;
  }, [clerkLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch auth profile once Clerk has loaded; sync tier and auto-reload saved dataset if logged in
  useEffect(() => {
    if (!clerkLoaded) return;
    async function loadAuthProfile() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data.loggedIn && !data.orgId) {
          router.replace('/onboarding');
          return;
        }
        setAuthProfile(data);
        authProfileRef.current = data;
        if (data.loggedIn && data.tier) {
          setTierState(data.tier);
          tierRef.current = data.tier;
        }
        if (data.loggedIn) {
          // Restore last map extent (dataset fitBounds will override if data exists)
          if (savedExtentRef.current) {
            mapRef.current?.flyTo(savedExtentRef.current);
            savedExtentRef.current = null;
          }
          // Restore geography panel selections from previous session
          try {
            const savedStates = JSON.parse(localStorage.getItem('dm_selected_states') || 'null');
            const savedCities = JSON.parse(localStorage.getItem('dm_selected_cities') || 'null');
            if (Array.isArray(savedStates) && savedStates.length > 0) setSelectedStates(savedStates);
            if (Array.isArray(savedCities) && savedCities.length > 0) setSelectedCities(savedCities);
          } catch {}
          autoReloadDataset();
        } else {
          // Non-logged-in visitor: default to NY + NYC
          loadDefaultState();
        }
      } catch {}
    }
    loadAuthProfile();
  }, [clerkLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function autoReloadDataset() {
    try {
      setPersistMsg({ type: 'saving', text: 'Restoring your dataset…' });
      const res = await fetch('/api/auth/load-dataset');
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setPersistMsg({ type: 'error', text: `Restore failed (${res.status}): ${e.error || 'unknown error'}` });
        return;
      }
      const { dataset } = await res.json();
      if (!dataset) {
        setPersistMsg({ type: 'error', text: 'No saved dataset found — upload your data to get started.' });
        setTimeout(() => setPersistMsg(null), 6000);
        return;
      }

      // Build all batch objects synchronously from the loaded data
      let newBatches = [];
      if (dataset.version === 2 && Array.isArray(dataset.batches) && dataset.batches.length > 0) {
        let globalOffset = 0;
        for (const [i, b] of dataset.batches.entries()) {
          if (!b.points?.length) continue;
          const batchId = `batch-${newBatches.length}`;
          const color = BATCH_COLORS[newBatches.length % BATCH_COLORS.length];
          const label = b.title || `Dataset ${newBatches.length + 1}`;
          const taggedPoints = b.points.map((p, j) => ({
            ...p, _batchId: batchId, _globalIndex: globalOffset + j, _datasetLabel: label,
          }));
          globalOffset += b.points.length;
          newBatches.push({ id: batchId, label, points: taggedPoints, originalRows: b.originalRows ?? [], headers: b.headers ?? [], color });
        }
      } else if (dataset.points?.length) {
        const batchId = 'batch-0';
        const label = dataset.title || dataset.filename || 'Dataset 1';
        const taggedPoints = dataset.points.map((p, i) => ({
          ...p, _batchId: batchId, _globalIndex: i, _datasetLabel: label,
        }));
        newBatches = [{ id: batchId, label, points: taggedPoints, originalRows: dataset.originalRows ?? [], headers: dataset.headers ?? [], color: BATCH_COLORS[0] }];
      }

      if (newBatches.length === 0) { setPersistMsg(null); return; }

      // Single atomic state update — no loop, no intermediate renders
      // Always mark demo as hidden when real data loads (harmless if demo isn't present)
      hiddenBatchesRef.current = new Set(['demo']);
      setHiddenBatches(new Set(['demo']));
      setDataBatches((prev) => {
        const prevDemo = prev.filter((b) => b.isDemo);
        return [...prevDemo, ...newBatches];
      });

      // Directly paint user points on the map now — don't wait for the useEffect,
      // which may fire before or after loadDemoDataset's concurrent fetch resolves.
      const batchColors = Object.fromEntries(newBatches.map((b) => [b.id, b.color]));
      mapRef.current?.setPointLayer(newBatches.flatMap((b) => b.points), batchColors);

      // Fit map to all loaded data
      const allPoints = newBatches.flatMap((b) => b.points);
      const lngs = allPoints.map((p) => p.lng);
      const lats = allPoints.map((p) => p.lat);
      mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);

      const total = allPoints.length;
      const countLabel = newBatches.length > 1
        ? `↺ ${newBatches.length} datasets restored (${total} records)`
        : `↺ Dataset restored (${total} records)`;
      setPersistMsg({ type: 'restored', text: countLabel });
      setTimeout(() => setPersistMsg(null), 5000);
    } catch (err) {
      setPersistMsg({ type: 'error', text: `Restore error: ${err.message}` });
    }
  }

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
    const rawName = districtName.replace(/^.+? [–-] /, '');

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

  function getLayerMeta(layerId) {
    if (LAYER_CONFIG[layerId]) return { districtField: LAYER_CONFIG[layerId].districtField, stateField: LAYER_CONFIG[layerId].stateField };
    if (layerId.startsWith('council-')) {
      const slug = layerId.slice('council-'.length);
      const city = CITY_COUNCIL_REGISTRY[slug];
      if (city) return { districtField: city.districtField ?? 'NAME', stateField: null };
      for (const c of Object.values(CITY_COUNCIL_REGISTRY)) {
        const extra = (c.extraLayers || []).find((e) => e.slug === slug);
        if (extra) return { districtField: extra.districtField ?? c.districtField ?? 'NAME', stateField: null };
      }
    }
    return { districtField: 'NAME', stateField: null };
  }

  function handleDistrictSelect(layerId, districtName) {
    if (selectedDistrict?.layerId === layerId && selectedDistrict?.districtName === districtName) {
      setSelectedDistrict(null);
      mapRef.current?.clearPointFilter();
      mapRef.current?.clearBoundaryFilter(layerId);
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
      const { districtField, stateField } = getLayerMeta(layerId);
      mapRef.current?.filterBoundaryToDistrict(layerId, districtField, districtName, stateField);
      mapRef.current?.fitToDistrict(layerId, districtField, districtName, stateField);
    }
  }

  function handleDistrictZoom(layerId, districtName) {
    const { districtField, stateField } = getLayerMeta(layerId);
    mapRef.current?.fitToDistrict(layerId, districtField, districtName, stateField);
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
    // layerGeojson is intentionally kept — removing it would re-trigger assignDistricts
    // and wipe the district columns from enrichedPoints, breaking the export dialog.
    setLayerColors((prev) => { const n = { ...prev }; delete n[layerId]; return n; });
    delete layerFipsRef.current[layerId];
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
      layerFipsRef.current[layerId] = fipsArray;
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

  function getLayerIdsFromGeos(geos) {
    if (!geos) return [];
    const ids = [];
    if (geos.congressional) ids.push('congressional');
    if (geos['us-senate']) ids.push('us-senate');
    for (const key of ['counties', 'county-subdivisions', 'zcta', 'state-senate', 'state-house',
      'school-unified', 'incorporated-places', 'school-elementary', 'school-secondary', 'opportunity-zones']) {
      if (geos[key]?.length > 0) ids.push(key);
    }
    for (const slug of (geos.cities ?? [])) {
      ids.push(`council-${slug}`);
      for (const { slug: extraSlug } of CITY_COUNCIL_REGISTRY[slug]?.extraLayers || []) {
        ids.push(`council-${extraSlug}`);
      }
    }
    return ids;
  }

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

    let allVisiblePoints = [];
    let batchesToSave = null;

    let demoBatchPresent = false;

    setDataBatches((prevBatches) => {
      const prevReal = prevBatches.filter((b) => !b.isDemo);
      const prevDemo = prevBatches.filter((b) => b.isDemo);
      demoBatchPresent = prevDemo.length > 0;

      if (demoBatchPresent) {
        // Auto-hide demo when real data arrives — session only, not persisted
        hiddenBatchesRef.current = new Set([...hiddenBatchesRef.current, 'demo']);
      }

      const batchIndex = isAdd ? prevReal.length : 0;
      const globalOffset = isAdd ? prevReal.reduce((sum, b) => sum + b.points.length, 0) : 0;
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
      // Keep demo in state (greyed out in LayerPanel); only save real batches
      const newBatches = isAdd ? [...prevDemo, ...prevReal, newBatch] : [...prevDemo, newBatch];
      batchesToSave = newBatches.filter((b) => !b.isDemo);

      // Map is synced by the dataBatches/hiddenBatches useEffect after state settles
      const visibleBatches = newBatches.filter((b) => !hiddenBatchesRef.current.has(b.id));
      allVisiblePoints = visibleBatches.flatMap((b) => b.points);

      return newBatches;
    });

    // Sync hiddenBatches state if demo was auto-hidden inside the updater
    if (demoBatchPresent) setHiddenBatches(new Set(hiddenBatchesRef.current));

    // Fit map to show all visible points — done outside updater to avoid side effects
    if (allVisiblePoints.length > 0) {
      const lngs = allVisiblePoints.map((p) => p.lng);
      const lats = allVisiblePoints.map((p) => p.lat);
      mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
    }

    setShowUploadModal(false);

    // Persist all batches for logged-in users.
    if (isSignedInRef.current && batchesToSave) {
      setPersistMsg({ type: 'saving', text: 'Saving dataset…' });
      const payload = {
        version: 2,
        batches: batchesToSave.map(b => ({
          points: b.points,
          originalRows: b.originalRows,
          headers: b.headers,
          title: b.label,
          color: b.color,
        })),
      };
      fetch('/api/auth/save-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            setPersistMsg({ type: 'error', text: `Save failed (${r.status}): ${e.error || 'unknown error'}` });
          } else {
            setPersistMsg({ type: 'saved', text: `✓ ${batchesToSave.length > 1 ? `${batchesToSave.length} datasets` : 'Dataset'} saved to your account` });
            setTimeout(() => setPersistMsg(null), 4000);
          }
        })
        .catch((err) => {
          setPersistMsg({ type: 'error', text: `Save failed: ${err.message}` });
        });
    }

    // Auto-select states and cities in the sidebar based on where the uploaded points land
    if (!isAdd && points.length > 0) {
      const detectedStates = detectStatesFromPoints(points);
      const detectedCities = detectCitiesFromPoints(points);
      if (detectedStates.length > 0 || detectedCities.length > 0) {
        setGeoSuggestions({ states: detectedStates, cities: detectedCities });
      }
    }

    if (!isAdd && geos) setSuggestedLayerIds(getLayerIdsFromGeos(geos));

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
          onUploadClick={(mode) => {
            if (!isSignedIn) {
              openPreAuth('Create a free account to upload and map your first dataset.');
              return;
            }
            uploadModeRef.current = mode;
            setShowUploadModal(true);
          }}
          hasData={dataBatches.length > 0}
          dataBatches={dataBatches}
          hiddenBatches={hiddenBatches}
          onToggleBatch={toggleBatchVisibility}
          onDeleteBatch={handleDeleteBatch}
          onHideDemo={handleHideDemo}
          geoSuggestions={geoSuggestions}
          onAddressLookup={handleAddressLookup}
          onAddressSelect={handleAddressSelect}
          onLookupClear={handleLookupClear}
          lookupStatus={lookupStatus}
          lookupLabel={lookupLabel}
          lookupDistricts={lookupDistricts}
          onGeographySelect={handleGeographySelect}
          tier={tier}
          onUpgradeClick={handleUpgradeClick}
          layerCounts={layerCounts}
          layerColors={layerColors}
          activeChoroLayer={activeChoroLayer}
          onChoroLayerSelect={handleChoroLayerSelect}
          authProfile={authProfile}
          multiSelectMode={multiSelectMode}
          onSwitchLayer={handleSwitchLayer}
          onToggleMultiSelect={toggleMultiSelectMode}
          selectedStates={selectedStates}
          selectedCities={selectedCities}
          onSelectedStatesChange={handleSelectedStatesChange}
          onSelectedCitiesChange={handleSelectedCitiesChange}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapView ref={mapRef} onMoveEnd={handleMapMoveEnd} />
          {processingStatus && <ProcessingBar status={processingStatus} />}
          {clerkLoaded && (
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 10,
              display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start',
            }}>
              {isSignedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserButton afterSignOutUrl="/" />
                  {authProfile?.personName && (
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#1c3557',
                      fontFamily: "'Open Sans', sans-serif",
                      background: 'rgba(255,255,255,0.9)',
                      padding: '2px 8px', borderRadius: 20,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    }}>
                      {authProfile.personName.split(' ')[0]}
                    </span>
                  )}
                  {authProfile?.tier && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      fontFamily: "'Open Sans', sans-serif",
                      padding: '2px 8px', borderRadius: 20,
                      background: authProfile.tier === 'enterprise' ? '#1c3557'
                               : authProfile.tier === 'pro' ? '#e63947'
                               : '#dde3ea',
                      color: authProfile.tier === 'free' ? '#555' : '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    }}>
                      {authProfile.tier}
                    </span>
                  )}
                  <a href="/account" style={{
                    fontSize: 11, color: '#7a8fa6', textDecoration: 'none',
                    fontFamily: "'Open Sans', sans-serif",
                  }}>Account</a>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => openPreAuth()}
                    style={{
                      background: '#e63947', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '7px 16px', fontSize: 12,
                      fontWeight: 700, fontFamily: "'Open Sans', sans-serif",
                      cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    Sign up free
                  </button>
                  <SignInButton mode="modal">
                    <button style={{
                      background: 'transparent', color: '#1c3557', border: 'none',
                      padding: '7px 4px', fontSize: 12,
                      fontWeight: 600, fontFamily: "'Open Sans', sans-serif",
                      cursor: 'pointer', textDecoration: 'underline',
                    }}>
                      Sign in
                    </button>
                  </SignInButton>
                </div>
              )}
              <Legend
                activeLayers={activeLayers}
                layerColors={layerColors}
                dataBatches={dataBatches}
                choroLayer={activeChoroLayer}
                choroColor={activeChoroLayer ? (layerColors[activeChoroLayer] || DEFAULT_LAYER_COLOR) : null}
                choroMax={choroMax}
              />
            </div>
          )}
          {showOverflowBanner && (
            <OverflowBanner
              overflowCount={overflowCount}
              onUpgrade={() => { setShowOverflowBanner(false); setShowUpgradeModal(true); }}
              onDismiss={() => setShowOverflowBanner(false)}
            />
          )}
          {/* Export / share buttons — sit below Mapbox NavigationControl (top-right) */}
          <div style={{ position: 'absolute', top: 116, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={dataBatches.length > 0 ? handleSaveImage : undefined}
              title={dataBatches.length > 0 ? 'Save map image' : 'Upload data first to save a map image'}
              style={{ ...mapActionBtn, ...(dataBatches.length === 0 ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }}
            >
              {/* Camera icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 2L4 3.5H1.5C1.22 3.5 1 3.72 1 4V11.5C1 11.78 1.22 12 1.5 12H12.5C12.78 12 13 11.78 13 11.5V4C13 3.72 12.78 3.5 12.5 3.5H10L9 2H5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </button>
            <button
              onClick={dataBatches.length > 0 ? handleCopyShareLink : undefined}
              title={dataBatches.length > 0 ? (shareCopied ? 'Link copied!' : 'Copy share link') : 'Upload data first to share a link'}
              style={{ ...mapActionBtn, ...(dataBatches.length === 0 ? { opacity: 0.35, cursor: 'not-allowed' } : { color: shareCopied ? '#166534' : '#333', background: shareCopied ? '#dcfce7' : '#fff' }) }}
            >
              {shareCopied ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                /* Link icon */
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.5 8.5L8.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M6.5 10.5L5.5 11.5C4.4 12.6 2.6 12.6 1.5 11.5C0.4 10.4 0.4 8.6 1.5 7.5L2.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M7.5 3.5L8.5 2.5C9.6 1.4 11.4 1.4 12.5 2.5C13.6 3.6 13.6 5.4 12.5 6.5L11.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            <button
              onClick={dataBatches.length > 0 ? () => setShowExportDialog(true) : undefined}
              title={dataBatches.length > 0 ? 'Export data' : 'Upload data first to export'}
              style={{ ...mapActionBtn, ...(dataBatches.length === 0 ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }}
            >
              {/* Download icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setShowTour(true)}
              title="How does this work?"
              style={{ ...mapActionBtn, background: '#f5a800', color: '#fff', boxShadow: '0 0 0 2px rgba(245,168,0,0.3)', animation: 'breathe 3s ease-in-out infinite' }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>?</span>
            </button>
          </div>

          {loadingLayer && (
            <div style={mapLoadingBadge}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
              Loading {LAYER_CONFIG[loadingLayer]?.displayName || loadingLayer}…
            </div>
          )}
          {dataBatches.some((b) => !hiddenBatches.has(b.id)) && (() => {
            const visibleBatches = dataBatches.filter((b) => !hiddenBatches.has(b.id));
            const visibleEnrichedPoints = enrichedPoints.filter((p) => !hiddenBatches.has(p._batchId));
            return (
              <AnalysisPanel
                uploadedData={{
                  points: visibleBatches.flatMap((b) => b.points),
                  originalRows: visibleBatches.flatMap((b) => b.originalRows),
                  headers: visibleBatches.find((b) => !b.isDemo)?.headers ?? visibleBatches[0]?.headers ?? [],
                }}
                enrichedPoints={visibleEnrichedPoints}
                activeLayers={activeLayers}
                layerCounts={layerCounts}
                layerColors={layerColors}
                selectedDistrict={selectedDistrict}
                onDistrictSelect={handleDistrictSelect}
                onDistrictZoom={handleDistrictZoom}
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
                onUpgradeClick={handleUpgradeClick}
                savedPolicies={savedPolicies}
                onSaveScan={handleSavePolicyScan}
                onDeletePolicyScan={handleDeletePolicyScan}
                multiSelectMode={multiSelectMode}
                dataBatches={visibleBatches}
                onBatchFocus={setFocusedBatchId}
              />
            );
          })()}
        </div>
      </div>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
          tier={tier}
          onOpenUpgrade={() => { setShowUploadModal(false); setShowUpgradeModal(true); }}
        />
      )}

      {showPreAuthModal && (
        <PreAuthModal onClose={closePreAuth} context={preAuthContext || ''} />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onUnlock={handleUnlock}
          authProfile={authProfile}
        />
      )}

      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}

      {showExportDialog && (
        <ExportDialog
          dataBatches={dataBatches.filter((b) => !b.isDemo)}
          enrichedPoints={enrichedPoints}
          suggestedLayers={availableLayers}
          activeLayers={activeLayers}
          existingLayerGeojson={layerGeojson}
          stateFips={selectedStates.map((s) => STATE_FIPS[s]).filter(Boolean)}
          tier={tier}
          onUpgradeClick={() => { setShowExportDialog(false); handleUpgradeClick(); }}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {persistMsg && (
        <div style={{
          position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000,
          background: persistMsg.type === 'error' ? '#fef2f2'
                     : persistMsg.type === 'saved' || persistMsg.type === 'restored' ? '#f0fdf4'
                     : 'rgba(28,53,87,0.92)',
          color: persistMsg.type === 'error' ? '#b91c1c'
               : persistMsg.type === 'saved' || persistMsg.type === 'restored' ? '#166534'
               : '#fff',
          border: persistMsg.type === 'error' ? '1px solid #fecaca'
                : persistMsg.type === 'saved' || persistMsg.type === 'restored' ? '1px solid #bbf7d0'
                : 'none',
          borderRadius: 8, padding: '9px 18px',
          fontFamily: "'Open Sans', sans-serif", fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
          whiteSpace: 'nowrap',
        }}>
          {persistMsg.text}
          {persistMsg.type === 'error' && (
            <button
              onClick={() => setPersistMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16, lineHeight: 1, padding: 0 }}
            >✕</button>
          )}
        </div>
      )}
    </>
  );
}

export async function getServerSideProps(ctx) {
  const { userId } = getAuth(ctx.req);
  if (userId) {
    try {
      const { rows } = await sql`SELECT id FROM orgs WHERE clerk_user_id = ${userId}`;
      if (!rows.length) {
        return { redirect: { destination: '/onboarding', permanent: false } };
      }
    } catch {
      // DB error — let them through rather than blocking access
    }
  }
  return { props: {} };
}
