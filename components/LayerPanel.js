import { useState } from 'react';
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
}) {
  const [openSections, setOpenSections] = useState({ national: true, state: false, local: false });
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

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
        <img src="/North_Arrow_logo.svg" alt="North Arrow" style={styles.logo} onError={(e) => { e.target.style.display = 'none'; }} />
        <span style={styles.appName}>District Mapper</span>
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
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 10px',
    borderBottom: '1px solid #dde3ea',
  },
  logo: { height: 28, width: 'auto' },
  appName: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--dark-navy)',
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
