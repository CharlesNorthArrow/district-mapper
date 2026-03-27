import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { geocodeAddresses } from '../lib/geocodeQueue';
import { auditData } from '../lib/dataAudit';
import { suggestGeographies } from '../lib/geoSuggest';

const CITY_DISPLAY = {
  nyc: 'New York City', la: 'Los Angeles', chicago: 'Chicago',
  houston: 'Houston', phoenix: 'Phoenix', philadelphia: 'Philadelphia',
  'san-antonio': 'San Antonio', 'san-diego': 'San Diego', dallas: 'Dallas',
  seattle: 'Seattle', portland: 'Portland', denver: 'Denver',
  boston: 'Boston', atlanta: 'Atlanta', dc: 'Washington, DC',
};

// Default enabled state per address role
const ROLE_ENABLED_DEFAULT = { street: true, city: true, county: false, state: true, zip: true };
const ROLE_LABELS = { street: 'Street / Address', city: 'City', county: 'County', state: 'State', zip: 'ZIP / Postal' };

export default function UploadModal({ onClose, onUploadComplete }) {
  const [step, setStep] = useState('idle');       // idle | review | geocoding | geography
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [audit, setAudit] = useState(null);

  const [latCol, setLatCol] = useState('');
  const [lngCol, setLngCol] = useState('');
  const [addrParts, setAddrParts] = useState([]);  // [{role, col, enabled}]

  // 'coords' | 'address' | 'manual'
  const [mode, setMode] = useState(null);
  // manual sub-mode: 'coords' | 'single' | 'parts'
  const [manualMode, setManualMode] = useState('single');
  const [manualAddrCol, setManualAddrCol] = useState('');
  const [manualLatCol, setManualLatCol] = useState('');
  const [manualLngCol, setManualLngCol] = useState('');

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Geography step
  const [pendingData, setPendingData] = useState(null);    // { points, rows, headers }
  const [geoSuggestions, setGeoSuggestions] = useState(null);
  const [geoChecks, setGeoChecks] = useState({
    congressional: true,
    stateSenate: new Set(),
    stateHouse: new Set(),
    cities: new Set(),
  });

  const fileRef = useRef();

  function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data, result.meta.fields),
        error: (err) => setError(err.message),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        processRows(data, cols);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Use CSV or XLSX.');
    }
  }

  function processRows(data, cols) {
    const result = auditData(cols, data);
    setAudit(result);
    setRows(data);
    setHeaders(cols);
    setError('');

    if (result.coordResult.confidence !== null) {
      setMode('coords');
      setLatCol(result.coordResult.latCol);
      setLngCol(result.coordResult.lngCol);
    } else if (result.addressResult.detected.length > 0) {
      setMode('address');
      setAddrParts(
        result.addressResult.detected.map((d) => ({
          ...d,
          enabled: ROLE_ENABLED_DEFAULT[d.role] ?? true,
        }))
      );
    } else {
      setMode('manual');
    }

    setStep('review');
  }

  function switchToAddressMode() {
    if (audit?.addressResult.detected.length > 0) {
      setAddrParts(
        audit.addressResult.detected.map((d) => ({
          ...d,
          enabled: ROLE_ENABLED_DEFAULT[d.role] ?? true,
        }))
      );
      setMode('address');
    } else {
      setMode('manual');
      setManualMode('single');
    }
  }

  function toggleAddrPart(col, enabled) {
    setAddrParts((prev) => prev.map((p) => (p.col === col ? { ...p, enabled } : p)));
  }

  function buildPreview() {
    if (!rows.length) return '';
    const enabledCols = addrParts.filter((p) => p.enabled).map((p) => p.col);
    for (const row of rows) {
      const parts = enabledCols.map((col) => String(row[col] || '').trim()).filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    return '';
  }

  function showGeoStep(resolvedPoints, resolvedRows, resolvedHeaders) {
    const suggestions = suggestGeographies(resolvedPoints);
    setPendingData({ points: resolvedPoints, rows: resolvedRows, headers: resolvedHeaders });
    setGeoSuggestions(suggestions);
    setGeoChecks({
      congressional: true,
      stateSenate: new Set(suggestions.states),
      stateHouse: new Set(),
      cities: new Set(suggestions.cities),
    });
    setStep('geography');
  }

  function toggleSenate(state) {
    setGeoChecks((prev) => {
      const s = new Set(prev.stateSenate);
      s.has(state) ? s.delete(state) : s.add(state);
      return { ...prev, stateSenate: s };
    });
  }

  function toggleHouse(state) {
    setGeoChecks((prev) => {
      const s = new Set(prev.stateHouse);
      s.has(state) ? s.delete(state) : s.add(state);
      return { ...prev, stateHouse: s };
    });
  }

  function toggleCity(slug) {
    setGeoChecks((prev) => {
      const s = new Set(prev.cities);
      s.has(slug) ? s.delete(slug) : s.add(slug);
      return { ...prev, cities: s };
    });
  }

  function handleStartAnalysis() {
    onUploadComplete(
      pendingData.points,
      pendingData.rows,
      pendingData.headers,
      {
        congressional: geoChecks.congressional,
        stateSenate: [...geoChecks.stateSenate],
        stateHouse: [...geoChecks.stateHouse],
        cities: [...geoChecks.cities],
      }
    );
  }

  function handleSkipGeo() {
    onUploadComplete(
      pendingData.points,
      pendingData.rows,
      pendingData.headers,
      { congressional: false, stateSenate: [], stateHouse: [], cities: [] }
    );
  }

  async function handleConfirm() {
    setError('');

    if (mode === 'coords') {
      const points = rows
        .map((row, i) => ({
          ...row,
          lat: parseFloat(row[latCol]),
          lng: parseFloat(row[lngCol]),
          _rowIndex: i,
        }))
        .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
      showGeoStep(points, rows, headers);
      return;
    }

    // Build address strings
    let addresses;
    if (mode === 'address') {
      const enabledCols = addrParts.filter((p) => p.enabled).map((p) => p.col);
      if (enabledCols.length === 0) {
        setError('Select at least one address column.');
        return;
      }
      addresses = rows.map((row) =>
        enabledCols.map((col) => String(row[col] || '').trim()).filter(Boolean).join(', ')
      );
    } else if (mode === 'manual') {
      if (manualMode === 'coords') {
        if (!manualLatCol || !manualLngCol) {
          setError('Select both latitude and longitude columns.');
          return;
        }
        const points = rows
          .map((row, i) => ({
            ...row,
            lat: parseFloat(row[manualLatCol]),
            lng: parseFloat(row[manualLngCol]),
            _rowIndex: i,
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
        showGeoStep(points, rows, headers);
        return;
      } else if (manualMode === 'single') {
        if (!manualAddrCol) {
          setError('Select an address column.');
          return;
        }
        addresses = rows.map((row) => String(row[manualAddrCol] || ''));
      } else {
        // 'parts' — same as address mode but using addrParts from manual selection
        const enabledCols = addrParts.filter((p) => p.enabled).map((p) => p.col);
        if (enabledCols.length === 0) {
          setError('Select at least one address column.');
          return;
        }
        addresses = rows.map((row) =>
          enabledCols.map((col) => String(row[col] || '').trim()).filter(Boolean).join(', ')
        );
      }
    }

    setStep('geocoding');
    setProgress(0);
    try {
      const results = await geocodeAddresses(addresses, setProgress);
      const points = rows
        .map((row, i) => ({
          ...row,
          lat: results[i]?.lat ?? null,
          lng: results[i]?.lng ?? null,
          _geocodeConfidence: results[i]?.confidence ?? 0,
          _rowIndex: i,
        }))
        .filter((p) => p.lat !== null && p.lng !== null);
      showGeoStep(points, rows, headers);
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  }

  const estSeconds = rows.length > 0 ? Math.round(rows.length * 0.2) : 0;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: 'var(--dark-navy)' }}>
            Upload Data
          </h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── IDLE ── */}
        {step === 'idle' && (
          <div style={body}>
            <p style={hint}>Upload a CSV or Excel file with addresses or coordinates.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ marginTop: 8 }}
              onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        )}

        {/* ── REVIEW: coords ── */}
        {step === 'review' && mode === 'coords' && (
          <div style={body}>
            <p style={detectedBadge}>✓ Coordinate columns detected</p>

            {audit?.coordResult.confidence === 'possible' && (
              <p style={warningStyle}>
                These columns look numeric but may not be geographic coordinates — check the samples below.
              </p>
            )}

            <div style={fieldGrid}>
              <span style={fieldLabel}>Latitude</span>
              <select style={sel} value={latCol} onChange={(e) => setLatCol(e.target.value)}>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span style={sampleStyle}>{audit?.coordResult.latSample.join('  ')}</span>
            </div>
            <div style={fieldGrid}>
              <span style={fieldLabel}>Longitude</span>
              <select style={sel} value={lngCol} onChange={(e) => setLngCol(e.target.value)}>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span style={sampleStyle}>{audit?.coordResult.lngSample.join('  ')}</span>
            </div>

            <p style={{ ...hint, marginTop: 8 }}>{rows.length.toLocaleString()} rows ready to map.</p>
            {error && <p style={errorStyle}>{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <button style={primaryBtn} onClick={handleConfirm}>Next →</button>
              <button style={linkBtn} onClick={switchToAddressMode}>Use addresses instead →</button>
            </div>
            <button style={linkBtn} onClick={() => setMode('manual')}>None of these look right</button>
          </div>
        )}

        {/* ── REVIEW: address ── */}
        {step === 'review' && mode === 'address' && (
          <div style={body}>
            <p style={hint}>No coordinate columns found. Build addresses from these columns:</p>

            <div style={{ marginTop: 4 }}>
              {addrParts.map((part) => (
                <label key={part.col} style={addrRow}>
                  <input
                    type="checkbox"
                    checked={part.enabled}
                    onChange={(e) => toggleAddrPart(part.col, e.target.checked)}
                  />
                  <span style={{ minWidth: 130, fontSize: 13 }}>{ROLE_LABELS[part.role] || part.role}</span>
                  <span style={sampleStyle}>"{part.sample}"</span>
                </label>
              ))}
            </div>

            {buildPreview() && (
              <div style={previewBox}>
                <span style={{ fontSize: 11, color: '#7a8fa6', marginBottom: 2 }}>Preview (first row)</span>
                <span style={{ fontSize: 13 }}>"{buildPreview()}"</span>
              </div>
            )}

            <p style={{ ...hint, marginTop: 8 }}>
              {rows.length.toLocaleString()} rows · ~{estSeconds}s to geocode
              {rows.length > 1000 && <span style={{ color: 'var(--red)', marginLeft: 4 }}>Large dataset — may take several minutes.</span>}
            </p>
            {error && <p style={errorStyle}>{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <button style={primaryBtn} onClick={handleConfirm}>Geocode &amp; Map</button>
            </div>
            <button style={linkBtn} onClick={() => setMode('manual')}>None of these look right</button>
          </div>
        )}

        {/* ── REVIEW: manual ── */}
        {step === 'review' && mode === 'manual' && (
          <div style={body}>
            <p style={hint}>We couldn't identify location data automatically. Choose what to use:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {[
                { val: 'coords', label: 'Latitude / longitude columns' },
                { val: 'single', label: 'Single address field' },
                { val: 'parts',  label: 'Build address from multiple columns' },
              ].map(({ val, label }) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="manualMode" value={val} checked={manualMode === val} onChange={() => setManualMode(val)} />
                  {label}
                </label>
              ))}
            </div>

            {manualMode === 'coords' && (
              <div style={{ marginTop: 10 }}>
                <div style={fieldGrid}>
                  <span style={fieldLabel}>Latitude column</span>
                  <select style={sel} value={manualLatCol} onChange={(e) => setManualLatCol(e.target.value)}>
                    <option value="">— select —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ ...fieldGrid, marginTop: 6 }}>
                  <span style={fieldLabel}>Longitude column</span>
                  <select style={sel} value={manualLngCol} onChange={(e) => setManualLngCol(e.target.value)}>
                    <option value="">— select —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            {manualMode === 'single' && (
              <div style={{ marginTop: 10 }}>
                <div style={fieldGrid}>
                  <span style={fieldLabel}>Address column</span>
                  <select style={sel} value={manualAddrCol} onChange={(e) => setManualAddrCol(e.target.value)}>
                    <option value="">— select —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            {manualMode === 'parts' && (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...hint, marginBottom: 6 }}>Select columns to combine into a full address:</p>
                {headers.map((h) => {
                  const part = addrParts.find((p) => p.col === h);
                  const enabled = part ? part.enabled : false;
                  return (
                    <label key={h} style={addrRow}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          if (part) {
                            toggleAddrPart(h, e.target.checked);
                          } else {
                            setAddrParts((prev) => [
                              ...prev,
                              { role: 'custom', col: h, sample: '', enabled: e.target.checked },
                            ]);
                          }
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{h}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <p style={{ ...hint, marginTop: 10 }}>
              {rows.length.toLocaleString()} rows
              {manualMode !== 'coords' && ` · ~${estSeconds}s to geocode`}
            </p>
            {error && <p style={errorStyle}>{error}</p>}
            <button style={{ ...primaryBtn, marginTop: 6 }} onClick={handleConfirm}>
              {manualMode === 'coords' ? 'Next →' : 'Geocode & Map'}
            </button>
          </div>
        )}

        {/* ── GEOCODING ── */}
        {step === 'geocoding' && (
          <div style={body}>
            <p style={hint}>Geocoding {rows.length.toLocaleString()} addresses…</p>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${progress}%` }} />
            </div>
            <p style={{ ...hint, marginTop: 8 }}>{progress}% complete</p>
          </div>
        )}

        {/* ── GEOGRAPHY ── */}
        {step === 'geography' && pendingData && (
          <div style={body}>
            <p style={detectedBadge}>✓ {pendingData.points.length.toLocaleString()} points mapped</p>
            <p style={hint}>
              {geoSuggestions?.states.length > 0 || geoSuggestions?.cities.length > 0
                ? 'We detected the following geographies in your data. Choose which boundary layers to load:'
                : 'Select boundary layers to load for analysis:'}
            </p>

            <div style={geoList}>
              {/* Congressional Districts — always offered */}
              <label style={geoRow}>
                <input
                  type="checkbox"
                  checked={geoChecks.congressional}
                  onChange={(e) => setGeoChecks((prev) => ({ ...prev, congressional: e.target.checked }))}
                />
                <div>
                  <div style={geoItemLabel}>Congressional Districts</div>
                  <div style={geoItemSub}>National — all 435 US districts</div>
                </div>
              </label>

              {/* State legislative layers */}
              {geoSuggestions?.states.length > 0 && (
                <>
                  <div style={sectionDivider}>State Legislative Districts</div>
                  {geoSuggestions.states.map((state) => (
                    <div key={state} style={stateRow}>
                      <span style={stateName}>{state}</span>
                      <label style={checkLabel}>
                        <input
                          type="checkbox"
                          checked={geoChecks.stateSenate.has(state)}
                          onChange={() => toggleSenate(state)}
                        />
                        Senate
                      </label>
                      <label style={checkLabel}>
                        <input
                          type="checkbox"
                          checked={geoChecks.stateHouse.has(state)}
                          onChange={() => toggleHouse(state)}
                        />
                        House
                      </label>
                    </div>
                  ))}
                </>
              )}

              {/* City council layers */}
              {geoSuggestions?.cities.length > 0 && (
                <>
                  <div style={sectionDivider}>City Council Districts</div>
                  {geoSuggestions.cities.map((slug) => (
                    <label key={slug} style={{ ...geoRow, borderBottom: 'none' }}>
                      <input
                        type="checkbox"
                        checked={geoChecks.cities.has(slug)}
                        onChange={() => toggleCity(slug)}
                      />
                      <div>
                        <div style={geoItemLabel}>{CITY_DISPLAY[slug] || slug}</div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>

            <p style={{ ...hint, color: '#7a8fa6', fontSize: 12 }}>
              You can add or remove layers at any time from the panel on the left.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <button style={primaryBtn} onClick={handleStartAnalysis}>Start Analysis →</button>
              <button style={linkBtn} onClick={handleSkipGeo}>Skip layers</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modal = {
  background: '#fff', borderRadius: 6,
  width: 480, maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column',
  maxHeight: '90vh', overflowY: 'auto',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #dde3ea',
};
const closeBtn = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6',
};
const body = { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 };
const hint = { fontSize: 13, color: '#4a5568', margin: 0 };
const errorStyle = { fontSize: 13, color: 'var(--red)', margin: 0 };
const warningStyle = { fontSize: 12, color: '#b45309', background: '#fef3c7', borderRadius: 3, padding: '6px 10px', margin: 0 };
const detectedBadge = { fontSize: 13, fontWeight: 600, color: '#166534', background: '#dcfce7', borderRadius: 3, padding: '6px 10px', margin: 0 };
const fieldGrid = { display: 'flex', alignItems: 'center', gap: 8 };
const fieldLabel = { fontSize: 13, minWidth: 90 };
const sel = { flex: 1, padding: '5px 8px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 13 };
const sampleStyle = { fontSize: 12, color: '#7a8fa6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 };
const addrRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', cursor: 'pointer' };
const previewBox = {
  display: 'flex', flexDirection: 'column', gap: 2,
  background: '#f8fafc', border: '1px solid #dde3ea', borderRadius: 3,
  padding: '8px 12px', marginTop: 4,
};
const primaryBtn = {
  padding: '9px 18px',
  background: 'var(--red)', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  alignSelf: 'flex-start',
};
const linkBtn = {
  background: 'none', border: 'none', fontSize: 12, color: 'var(--mid-blue)',
  cursor: 'pointer', padding: 0, textDecoration: 'underline', alignSelf: 'flex-start',
};
const progressTrack = { height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 8 };
const progressFill = { height: '100%', background: 'var(--red)', borderRadius: 4, transition: 'width 0.3s ease' };

// Geography step styles
const geoList = {
  border: '1px solid #dde3ea', borderRadius: 4, overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};
const geoRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', cursor: 'pointer',
  borderBottom: '1px solid #f0f4f8', background: '#fff',
};
const geoItemLabel = { fontSize: 13, fontWeight: 600, color: '#1c3557' };
const geoItemSub = { fontSize: 11, color: '#7a8fa6', marginTop: 2 };
const sectionDivider = {
  fontSize: 11, fontWeight: 600, color: '#7a8fa6',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  padding: '7px 14px 5px', background: '#f8fafc',
  borderBottom: '1px solid #f0f4f8',
};
const stateRow = {
  display: 'flex', alignItems: 'center',
  padding: '9px 14px', gap: 16,
  borderBottom: '1px solid #f0f4f8', background: '#fff',
};
const stateName = { fontSize: 13, color: '#1c3557', flex: 1, fontWeight: 500 };
const checkLabel = {
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 13, cursor: 'pointer', color: '#4a5568', whiteSpace: 'nowrap',
};
