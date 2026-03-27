import { useState, useRef, useEffect } from 'react';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { STATE_FIPS } from '../lib/stateFips';

const US_STATES = Object.keys(STATE_FIPS).sort();
const NATIONAL_LAYERS = ['congressional', 'us-senate'];
const STATE_LAYERS = ['state-senate', 'state-house', 'school-unified', 'school-elementary', 'school-secondary'];

export default function LayerPanel({
  activeLayers,
  loadingLayer,
  onLayerToggle,
  onStateLayerToggle,
  onCityLayerToggle,
  onCustomLayer,
  onUploadClick,
  hasData,
  onAddressLookup,
  onAddressSelect,
  lookupStatus,
  lookupLabel,
  lookupDistricts,
}) {
  const [openSections, setOpenSections] = useState({ national: true, state: false, local: false });
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [lookupInput, setLookupInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const lookupInputRef = useRef();

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

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleStateLayerCheck(layerId, checked) {
    if (!selectedState) return;
    const fips = STATE_FIPS[selectedState];
    onStateLayerToggle(layerId, checked, fips);
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

  const filteredStates = US_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const cityEntries = Object.entries(CITY_COUNCIL_REGISTRY).filter(([, c]) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  function LayerRow({ layerId, label, onToggle }) {
    const isActive = activeLayers.includes(layerId);
    const isLoading = loadingLayer === layerId;
    return (
      <label style={styles.layerRow}>
        <input
          type="checkbox"
          checked={isActive}
          disabled={isLoading}
          onChange={(e) => onToggle(layerId, e.target.checked)}
        />
        <span style={{ fontSize: 13 }}>{label}</span>
        {isLoading && <span style={styles.spinner}>↻</span>}
      </label>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <img src="/North_Arrow_logo.png" alt="North Arrow" style={styles.logo} />
        <span style={styles.appName}>District Mapper</span>
      </div>

      {/* Address lookup */}
      <div style={styles.lookupBox}>
        <div style={{ position: 'relative' }}>
        <form
          style={styles.lookupRow}
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
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
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
        </form>

        </div>
        {suggestions.length > 0 && (
          <div style={styles.suggestions}>
            {suggestions.map((f) => (
              <button
                key={f.id}
                style={styles.suggestion}
                onMouseDown={() => {
                  const [lng, lat] = f.center;
                  setLookupInput(f.place_name);
                  setSuggestions([]);
                  onAddressSelect(lat, lng, f.place_name);
                }}
              >
                {f.place_name}
              </button>
            ))}
          </div>
        )}

        {lookupStatus === 'found' && (
          <>
            <p style={styles.lookupFound}>{lookupLabel}</p>
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

      <button style={styles.uploadBtn} onClick={onUploadClick}>
        {hasData ? 'Replace Data Upload' : '+ Upload Data'}
      </button>

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
            <input
              style={styles.search}
              placeholder="Search state…"
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
            />
            <select
              style={styles.select}
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              size={4}
            >
              {filteredStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {selectedState ? (
              <div style={{ marginTop: 8 }}>
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
              <p style={{ ...styles.hint, marginTop: 6 }}>Select a state to enable district layers</p>
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
            <p style={styles.hint}>Council districts (Tier 1 cities)</p>
            <input
              style={styles.search}
              placeholder="Search city…"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
            />
            <select
              style={styles.select}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              size={4}
            >
              {cityEntries.map(([slug, c]) => (
                <option key={slug} value={slug}>{c.name}</option>
              ))}
            </select>
            {selectedCity && (
              <LayerRow
                layerId={`council-${selectedCity}`}
                label="Council Districts"
                onToggle={(_, checked) => onCityLayerToggle(selectedCity, checked)}
              />
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
    alignItems: 'flex-start',
    gap: 2,
    padding: '12px 16px 10px',
    borderBottom: '1px solid #dde3ea',
  },
  logo: { height: 36, width: 'auto', maxWidth: 220 },
  appName: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 12,
    color: 'var(--mid-blue)',
    marginTop: 2,
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
    left: 0, right: 0,
    background: '#fff',
    border: '1px solid #c5d0da',
    borderRadius: '0 0 4px 4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
  },
  suggestion: {
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f0f4f8',
    padding: '7px 10px',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
    lineHeight: 1.4,
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
    margin: '12px 16px',
    padding: '8px 12px',
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
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
  search: {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid #c5d0da',
    borderRadius: 3,
    fontSize: 12,
    marginBottom: 4,
  },
  select: {
    width: '100%',
    fontSize: 12,
    border: '1px solid #c5d0da',
    borderRadius: 3,
    padding: 2,
  },
  hint: { fontSize: 11, color: '#7a8fa6', marginBottom: 4 },
  spinner: { fontSize: 13, color: 'var(--mid-blue)', animation: 'spin 1s linear infinite' },
};
