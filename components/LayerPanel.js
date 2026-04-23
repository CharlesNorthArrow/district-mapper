import { useState, useRef, useEffect } from 'react';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { STATE_FIPS, STATE_ABBR } from '../lib/stateFips';
import { STATE_BBOX, CITY_BBOX } from '../lib/geoSuggest';
import GeoRequestModal from './GeoRequestModal';
import { isLayerLocked } from '../lib/tierConfig';

const NAME_TO_ABBR = Object.fromEntries(Object.entries(STATE_ABBR).map(([abbr, name]) => [name, abbr]));

const US_STATES = Object.keys(STATE_FIPS).sort();
// Free layers first, then locked — within each section
const NATIONAL_LAYERS = ['congressional', 'us-senate', 'tribal-lands', 'urban-areas'];
const STATE_LAYERS = [
  // Free tier
  'counties', 'census-tracts', 'county-subdivisions', 'zcta',
  'state-senate', 'state-house', 'school-unified',
  // Locked (pro+)
  'incorporated-places', 'school-elementary', 'school-secondary', 'opportunity-zones',
];

export default function LayerPanel({
  activeLayers,
  loadingLayer,
  onLayerToggle,
  onStateLayerToggle,
  onCityLayerToggle,
  onCustomLayer,
  onUploadClick,
  hasData,
  dataBatches,
  hiddenBatches,
  onToggleBatch,
  geoSuggestions,
  onAddressLookup,
  onAddressSelect,
  onLookupClear,
  lookupStatus,
  lookupLabel,
  lookupDistricts,
  onGeographySelect,
  tier = 'free',
  onUpgradeClick,
  layerCounts = {},
  layerColors = {},
  activeChoroLayer,
  onChoroLayerSelect,
}) {
  const [openSections, setOpenSections] = useState({ data: true, national: true, state: false, local: false });
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showStateSearch, setShowStateSearch] = useState(false);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [showGeoRequest, setShowGeoRequest] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const lookupInputRef = useRef();

  // Keep a ref to activeLayers so effects can read it without being in their deps
  const activeLayersRef = useRef(activeLayers);
  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);

  // Debounced autocomplete — calls Mapbox Geocoding API as user types
  useEffect(() => {
    const q = lookupInput.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${token}&autocomplete=true&country=us&types=address,place,locality&limit=5`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch { /* network error — leave suggestions as-is */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [lookupInput]);

  // React to new upload — auto-expand and pre-select detected geographies
  useEffect(() => {
    if (!geoSuggestions) return;
    const updates = {};
    if (geoSuggestions.states.length > 0) {
      updates.state = true;
      setSelectedStates(geoSuggestions.states);
    }
    if (geoSuggestions.cities.length > 0) {
      updates.local = true;
      setSelectedCities(geoSuggestions.cities);
    }
    if (Object.keys(updates).length > 0) {
      setOpenSections((prev) => ({ ...prev, ...updates }));
    }
  }, [geoSuggestions]);

  // Re-fetch active state layers whenever the selected state set changes
  const isFirstStateRender = useRef(true);
  useEffect(() => {
    if (isFirstStateRender.current) { isFirstStateRender.current = false; return; }
    const fipsArray = selectedStates.map((s) => STATE_FIPS[s]).filter(Boolean);
    for (const id of STATE_LAYERS) {
      if (activeLayersRef.current.includes(id)) {
        onStateLayerToggle(id, fipsArray.length > 0, fipsArray);
      }
    }
  }, [selectedStates]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    if (key === 'state') setShowStateSearch(false);
    if (key === 'local') setShowCitySearch(false);
  }

  function addState(name) {
    setSelectedStates((prev) => prev.includes(name) ? prev : [...prev, name]);
    setStateSearch('');
    setShowStateSearch(false);
    const bbox = STATE_BBOX[name];
    if (bbox) onGeographySelect?.(bbox);
  }

  function removeState(name) {
    setSelectedStates((prev) => prev.filter((s) => s !== name));
  }

  function addCity(slug) {
    setSelectedCities((prev) => prev.includes(slug) ? prev : [...prev, slug]);
    setCitySearch('');
    setShowCitySearch(false);
    const bbox = CITY_BBOX[slug];
    if (bbox) onGeographySelect?.(bbox);
  }

  function removeCity(slug) {
    // Remove the main council layer and any extra layers for this city
    onCityLayerToggle(slug, false);
    for (const { slug: extraSlug } of CITY_COUNCIL_REGISTRY[slug]?.extraLayers || []) {
      onCityLayerToggle(extraSlug, false);
    }
    setSelectedCities((prev) => prev.filter((c) => c !== slug));
  }

  function handleStateLayerCheck(layerId, checked) {
    const fipsArray = selectedStates.map((s) => STATE_FIPS[s]).filter(Boolean);
    if (fipsArray.length === 0) return;
    onStateLayerToggle(layerId, checked, fipsArray);
  }

  function handleCustomFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const geojson = JSON.parse(ev.target.result);
        if (geojson.type !== 'FeatureCollection') {
          alert('File must be a GeoJSON FeatureCollection.');
          return;
        }
        const layerId = `custom-${file.name.replace(/\W+/g, '-')}`;
        onCustomLayer(layerId, geojson);
      } catch {
        alert('Could not parse file as GeoJSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const filteredStates = US_STATES.filter((s) => {
    const q = stateSearch.toLowerCase();
    if (!q) return true;
    if (s.toLowerCase().includes(q)) return true;
    const abbr = NAME_TO_ABBR[s];
    return abbr ? abbr.toLowerCase().includes(q) : false;
  });

  const cityEntries = Object.entries(CITY_COUNCIL_REGISTRY)
    // Exclude sub-entries (like nyc-nta) that exist only as extras under a parent city
    .filter(([slug, c]) => !slug.includes('-') || !Object.values(CITY_COUNCIL_REGISTRY).some(
      (other) => (other.extraLayers || []).some((e) => e.slug === slug)
    ))
    .filter(([, c]) => c.name.toLowerCase().includes(citySearch.toLowerCase()));

  function LayerRow({ layerId, label, onToggle }) {
    const isActive = activeLayers.includes(layerId);
    const isLoading = loadingLayer === layerId;
    const locked = isLayerLocked(layerId, tier);
    const isChoro = activeChoroLayer === layerId;
    const count = layerCounts[layerId];
    const canAnalyze = hasData && isActive && !locked;
    const hasMatches = count > 0;
    const layerColor = layerColors[layerId];
    return (
      <div style={{ ...styles.layerRow, opacity: locked ? 0.5 : 1, borderLeft: hasMatches ? `3px solid ${layerColor || '#467c9d'}` : '3px solid transparent', paddingLeft: hasMatches ? 5 : 8 }}>
        <input
          type="checkbox"
          checked={isActive}
          disabled={isLoading || locked}
          onChange={locked
            ? (e) => { e.preventDefault(); onUpgradeClick?.(); }
            : (e) => onToggle(layerId, e.target.checked)}
        />
        <span
          style={{
            fontSize: 13, flex: 1,
            cursor: canAnalyze ? 'pointer' : 'default',
            color: isChoro ? 'var(--mid-blue)' : 'inherit',
            fontWeight: isChoro ? 600 : 400,
          }}
          onClick={() => { if (canAnalyze) onChoroLayerSelect?.(layerId); }}
        >
          {locked && <span style={{ marginRight: 3 }}>🔒</span>}
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{ ...styles.badge, background: isChoro ? 'var(--mid-blue)' : '#e8edf2', color: isChoro ? '#fff' : '#1c3557' }}>
            {count.toLocaleString()}
          </span>
        )}
        {isLoading && !locked && <span style={styles.spinner}>↻</span>}
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <img src="/North_Arrow_icon.png" alt="North Arrow" style={styles.icon} />
          <span style={styles.appName}>District Mapper</span>
        </div>
        <p style={styles.attribution}>
          A nonprofit tool by{' '}
          <a
            href="https://north-arrow.org"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.attributionLink}
          >
            North Arrow
          </a>
          {' · '}
          <a
            href="/policy"
            style={styles.attributionLink}
          >
            Policy Pulse
          </a>
        </p>
      </div>

      {/* Address lookup */}
      <div style={styles.lookupBox}>
        <form
          style={{ ...styles.lookupRow, position: 'relative' }}
          onSubmit={(e) => {
            e.preventDefault();
            setSuggestions([]);
            onAddressLookup(lookupInput);
          }}
        >
          <input
            ref={lookupInputRef}
            style={styles.lookupInput}
            placeholder="Look up an address…"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            onBlur={() => setSuggestions([])}
            disabled={lookupStatus === 'loading'}
            autoComplete="off"
          />
          <button
            type="submit"
            style={styles.lookupBtn}
            disabled={lookupStatus === 'loading' || !lookupInput.trim()}
          >
            {lookupStatus === 'loading' ? '…' : '→'}
          </button>

          {suggestions.length > 0 && (
            <div
              style={styles.suggestions}
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestions.map((f) => {
                const [primary, ...rest] = f.place_name.split(', ');
                const context = rest.slice(0, 2).join(', ');
                return (
                  <button
                    key={f.id}
                    style={styles.suggestion}
                    onClick={() => {
                      const [lng, lat] = f.center;
                      setLookupInput(f.place_name);
                      setSuggestions([]);
                      onAddressSelect(lat, lng, f.place_name);
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600 }}>{primary}</span>
                    {context && <span style={{ fontSize: 11, color: '#7a8fa6' }}>{context}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </form>

        {lookupStatus === 'found' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <p style={{ ...styles.lookupFound, margin: 0, flex: 1 }}>{lookupLabel}</p>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#7a8fa6', padding: '0 0 0 6px', lineHeight: 1 }}
                onClick={() => { setLookupInput(''); onLookupClear?.(); }}
                title="Clear lookup"
              >✕</button>
            </div>
            {lookupDistricts === null && (
              <p style={styles.lookupLoading}>Looking up districts…</p>
            )}
            {lookupDistricts !== null && Object.keys(lookupDistricts).length > 0 && (
              <div style={styles.lookupDistricts}>
                {Object.entries(lookupDistricts).map(([layerId, name]) => (
                  <div key={layerId} style={styles.lookupDistrictRow}>
                    <span style={styles.lookupDistrictLabel}>
                      {LAYER_CONFIG[layerId]?.displayName || layerId}
                    </span>
                    <span style={styles.lookupDistrictName}>{name}</span>
                  </div>
                ))}
              </div>
            )}
            {lookupDistricts !== null && Object.keys(lookupDistricts).length === 0 && (
              <p style={styles.lookupNoMatch}>No district matches found</p>
            )}
          </>
        )}
        {lookupStatus === 'error' && (
          <p style={styles.lookupError}>{lookupLabel}</p>
        )}
      </div>

      {!hasData ? (
        <button style={styles.uploadBtn} onClick={() => onUploadClick('overwrite')}>
          + Upload Program Data
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button style={styles.uploadBtn} onClick={() => onUploadClick('add')}>
            + Add New Program Data
          </button>
          <button style={{ ...styles.uploadBtn, ...styles.uploadBtnSecondary }} onClick={() => onUploadClick('overwrite')}>
            Overwrite Program Data
          </button>
        </div>
      )}

      {/* Program Data section */}
      {dataBatches?.length > 0 && (
        <div style={styles.section}>
          <button style={styles.sectionHeader} onClick={() => toggleSection('data')}>
            <span>Program Data</span>
            <span>{openSections.data ? '▲' : '▼'}</span>
          </button>
          {openSections.data && (
            <div style={styles.sectionBody}>
              {dataBatches.map((batch) => (
                <label key={batch.id} style={styles.layerRow}>
                  <input
                    type="checkbox"
                    checked={!hiddenBatches?.has(batch.id)}
                    onChange={() => onToggleBatch?.(batch.id)}
                  />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: batch.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{batch.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* National section */}
      <div style={styles.section}>
        <button style={styles.sectionHeader} onClick={() => toggleSection('national')}>
          <span>National</span>
          <span>{openSections.national ? '▲' : '▼'}</span>
        </button>
        {openSections.national && (
          <div style={styles.sectionBody}>
            {NATIONAL_LAYERS.map((layerId) => (
              <LayerRow
                key={layerId}
                layerId={layerId}
                label={LAYER_CONFIG[layerId].displayName}
                onToggle={onLayerToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* State section */}
      <div style={styles.section}>
        <button style={styles.sectionHeader} onClick={() => toggleSection('state')}>
          <span>State</span>
          <span>{openSections.state ? '▲' : '▼'}</span>
        </button>
        {openSections.state && (
          <div style={styles.sectionBody}>
            {/* Selected state chips */}
            {selectedStates.length > 0 && (
              <div style={{ ...styles.chips, marginBottom: 8 }}>
                {selectedStates.map((s) => (
                  <button
                    key={s}
                    style={{ ...styles.chip, ...styles.chipActive }}
                    onClick={() => removeState(s)}
                  >
                    {NAME_TO_ABBR[s] || s} ×
                  </button>
                ))}
              </div>
            )}

            {/* State search — shown only when user asks for it */}
            {showStateSearch ? (
              <div style={styles.searchBox}>
                <input
                  autoFocus
                  style={styles.search}
                  placeholder="Search states…"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                />
                {filteredStates.filter((s) => !selectedStates.includes(s)).length > 0 && (
                  <select
                    style={styles.select}
                    value=""
                    onChange={(e) => { if (e.target.value) addState(e.target.value); }}
                    size={4}
                  >
                    <option value="" disabled />
                    {filteredStates.filter((s) => !selectedStates.includes(s)).map((s) => (
                      <option key={s} value={s}>{s} ({NAME_TO_ABBR[s] || ''})</option>
                    ))}
                  </select>
                )}
                <button style={styles.cancelSearchBtn} onClick={() => { setShowStateSearch(false); setStateSearch(''); }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button style={styles.addBtn} onClick={() => setShowStateSearch(true)}>
                + Add state
              </button>
            )}

            {selectedStates.length > 0 ? (
              <div style={styles.layerGroup}>
                {STATE_LAYERS.map((layerId) => (
                  <LayerRow
                    key={layerId}
                    layerId={layerId}
                    label={LAYER_CONFIG[layerId].displayName}
                    onToggle={(id, checked) => handleStateLayerCheck(id, checked)}
                  />
                ))}
              </div>
            ) : (
              !showStateSearch && (
                <p style={{ ...styles.hint, marginTop: 6 }}>
                  Select a state to enable district layers
                </p>
              )
            )}
          </div>
        )}
      </div>

      {/* Local section */}
      <div style={styles.section}>
        <button style={styles.sectionHeader} onClick={() => toggleSection('local')}>
          <span>Local</span>
          <span>{openSections.local ? '▲' : '▼'}</span>
        </button>
        {openSections.local && (
          <div style={styles.sectionBody}>
            {/* Selected city chips */}
            {selectedCities.length > 0 && (
              <div style={{ ...styles.chips, marginBottom: 8 }}>
                {selectedCities.map((slug) => (
                  <button
                    key={slug}
                    style={{ ...styles.chip, ...styles.chipActive }}
                    onClick={() => removeCity(slug)}
                  >
                    {CITY_COUNCIL_REGISTRY[slug]?.name || slug} ×
                  </button>
                ))}
              </div>
            )}

            {/* City search — shown only when user asks for it */}
            {showCitySearch ? (
              <div style={styles.searchBox}>
                <input
                  autoFocus
                  style={styles.search}
                  placeholder="Search cities…"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
                {cityEntries.filter(([slug]) => !selectedCities.includes(slug)).length > 0 && (
                  <select
                    style={styles.select}
                    value=""
                    onChange={(e) => { if (e.target.value) addCity(e.target.value); }}
                    size={4}
                  >
                    <option value="" disabled />
                    {cityEntries.filter(([slug]) => !selectedCities.includes(slug)).map(([slug, c]) => (
                      <option key={slug} value={slug}>{c.name}</option>
                    ))}
                  </select>
                )}
                <button style={styles.cancelSearchBtn} onClick={() => { setShowCitySearch(false); setCitySearch(''); }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button style={styles.addBtn} onClick={() => setShowCitySearch(true)}>
                + Add city
              </button>
            )}

            {/* Layers per selected city */}
            {selectedCities.length > 0 && (
              <div style={styles.layerGroup}>
                {selectedCities.map((slug) => (
                  <div key={slug} style={{ marginBottom: 6 }}>
                    <div style={styles.cityGroupLabel}>
                      {CITY_COUNCIL_REGISTRY[slug]?.name || slug}
                    </div>
                    <LayerRow
                      layerId={`council-${slug}`}
                      label="Council Districts"
                      onToggle={(_, checked) => onCityLayerToggle(slug, checked)}
                    />
                    {(CITY_COUNCIL_REGISTRY[slug]?.extraLayers || []).map(({ slug: extraSlug, label }) => (
                      <LayerRow
                        key={extraSlug}
                        layerId={`council-${extraSlug}`}
                        label={label}
                        onToggle={(_, checked) => onCityLayerToggle(extraSlug, checked)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!selectedCities.length && !showCitySearch && (
              <p style={{ ...styles.hint, marginTop: 6 }}>
                Select a city to enable council districts
              </p>
            )}

            <p style={{ ...styles.hint, marginTop: 12 }}>Custom boundary (GeoJSON)</p>
            <input
              type="file"
              accept=".geojson,.json"
              style={{ fontSize: 12, marginTop: 4 }}
              onChange={handleCustomFile}
            />
          </div>
        )}
      </div>
      {/* Can't Find Your Geography */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #dde3ea', marginTop: 4 }}>
        <button style={styles.geoRequestBtn} onClick={() => setShowGeoRequest(true)}>
          Can't Find Your Geography?
        </button>
      </div>

      {showGeoRequest && <GeoRequestModal onClose={() => setShowGeoRequest(false)} />}
    </div>
  );
}

const styles = {
  panel: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    height: '100%',
    background: '#fff',
    borderRight: '1px solid #dde3ea',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 16px 14px',
    background: '#1c3557',
    borderBottom: 'none',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    height: 38,
    width: 38,
    flexShrink: 0,
    borderRadius: 8,
  },
  appName: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#ffffff',
    lineHeight: 1.1,
  },
  attribution: {
    margin: 0,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    paddingLeft: 2,
  },
  attributionLink: {
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.4)',
  },
  lookupBox: {
    padding: '10px 16px 8px',
    borderBottom: '1px solid #dde3ea',
  },
  lookupRow: {
    display: 'flex',
    gap: 6,
  },
  lookupInput: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #c5d0da',
    borderRadius: 4,
    fontSize: 12,
  },
  lookupBtn: {
    padding: '6px 10px',
    background: 'var(--mid-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 700,
  },
  suggestions: {
    position: 'absolute',
    top: '100%', left: 0, right: 0,
    background: '#fff',
    border: '1px solid #c5d0da',
    borderTop: 'none',
    borderRadius: '0 0 5px 5px',
    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  suggestion: {
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f0f4f8',
    padding: '6px 10px',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
    lineHeight: 1.35,
    color: 'var(--dark-navy)',
  },
  lookupFound: {
    fontSize: 11,
    color: '#166534',
    margin: '4px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lookupDistricts: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  lookupDistrictRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 6,
  },
  lookupDistrictLabel: {
    fontSize: 10,
    color: '#7a8fa6',
    whiteSpace: 'nowrap',
  },
  lookupDistrictName: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--dark-navy)',
    textAlign: 'right',
  },
  lookupLoading: {
    fontSize: 11,
    color: '#7a8fa6',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  lookupNoMatch: {
    fontSize: 11,
    color: '#7a8fa6',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  lookupError: {
    fontSize: 11,
    color: 'var(--red)',
    margin: '4px 0 0',
  },
  uploadBtn: {
    margin: '12px 16px 0',
    padding: '8px 12px',
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  uploadBtnSecondary: {
    background: 'transparent',
    color: 'var(--mid-blue)',
    border: '1px solid var(--mid-blue)',
    fontSize: 12,
    fontWeight: 500,
  },
  section: { borderBottom: '1px solid #dde3ea' },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--dark-navy)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  sectionBody: { padding: '4px 16px 12px' },
  layerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    cursor: 'pointer',
    fontSize: 13,
  },
  layerGroup: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #eef1f4',
  },
  cityGroupLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#7a8fa6',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 1,
    marginTop: 4,
  },
  search: {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid #c5d0da',
    borderRadius: 3,
    fontSize: 12,
    marginBottom: 4,
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    fontSize: 12,
    border: '1px solid #c5d0da',
    borderRadius: 3,
    padding: 2,
  },
  hint: { fontSize: 11, color: '#7a8fa6', marginBottom: 4 },
  searchBox: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 },
  addBtn: {
    background: 'none', border: '1px dashed #c5d0da', borderRadius: 3,
    fontSize: 11, fontWeight: 600, color: 'var(--mid-blue)',
    cursor: 'pointer', padding: '4px 10px', alignSelf: 'flex-start',
    marginBottom: 4,
  },
  cancelSearchBtn: {
    background: 'none', border: 'none', fontSize: 11, color: '#7a8fa6',
    cursor: 'pointer', padding: 0, textDecoration: 'underline', alignSelf: 'flex-start',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: {
    padding: '3px 8px',
    background: '#edf2f7',
    border: '1px solid #c5d0da',
    borderRadius: 12,
    fontSize: 11, fontWeight: 600,
    color: 'var(--dark-navy)',
    cursor: 'pointer',
  },
  chipActive: {
    background: 'var(--mid-blue)',
    borderColor: 'var(--mid-blue)',
    color: '#fff',
  },
  spinner: { fontSize: 13, color: 'var(--mid-blue)', animation: 'spin 1s linear infinite' },
  badge: {
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '1px 5px', borderRadius: 8,
    lineHeight: 1.5, flexShrink: 0,
  },
  geoRequestBtn: {
    width: '100%',
    padding: '9px 12px',
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
};
