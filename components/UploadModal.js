import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { geocodeAddresses } from '../lib/geocodeQueue';
import { auditData } from '../lib/dataAudit';
import { getRowLimit, TIERS } from '../lib/tierConfig';

// Default enabled state per address role
const ROLE_ENABLED_DEFAULT = { street: true, city: true, county: false, state: true, zip: true };
const ROLE_LABELS = { street: 'Street / Address', city: 'City', county: 'County', state: 'State', zip: 'ZIP / Postal' };

export default function UploadModal({ onClose, onUploadComplete, tier = 'free', onOpenUpgrade }) {
  const [step, setStep] = useState('idle');       // idle | review | geocoding | complete
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

  // Completion step
  const [pendingData, setPendingData] = useState(null);    // { points, rows, headers, geocodeFailed, overflowCount }
  const [dataTitle, setDataTitle] = useState('');

  const fileRef = useRef();

  function getLimitWarning(rowsSkipped, limit) {
    const tierName = tier === 'free_anonymous' ? 'Guest' : tier === 'free' ? 'Free account' : (TIERS[tier]?.label ?? 'Current plan');
    const cta = tier === 'free_anonymous' ? 'Sign in free for higher limits.' : 'Upgrade to analyze all.';
    return `⚠ ${tierName} limit is ${limit.toLocaleString()} rows. The remaining ${rowsSkipped.toLocaleString()} rows will be skipped — ${cta}`;
  }

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

  function showCompleteStep(resolvedPoints, resolvedRows, resolvedHeaders, geocodeFailed = [], overflowCount = 0) {
    setPendingData({ points: resolvedPoints, rows: resolvedRows, headers: resolvedHeaders, geocodeFailed, overflowCount });
    setStep('complete');
  }

  function handleMapData() {
    onUploadComplete(pendingData.points, pendingData.rows, pendingData.headers, null, dataTitle.trim(), pendingData.overflowCount ?? 0);
  }

  async function handleConfirm() {
    setError('');

    if (mode === 'coords') {
      const limit = getRowLimit(true, tier);
      const overflow = limit < Infinity && rows.length > limit ? rows.length - limit : 0;
      const rowsToProcess = overflow > 0 ? rows.slice(0, limit) : rows;
      const points = rowsToProcess
        .map((row, i) => ({
          ...row,
          lat: parseFloat(row[latCol]),
          lng: parseFloat(row[lngCol]),
          _rowIndex: i,
        }))
        .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
      showCompleteStep(points, rowsToProcess, headers, [], overflow);
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
        const limit = getRowLimit(true, tier);
        const overflow = limit < Infinity && rows.length > limit ? rows.length - limit : 0;
        const rowsToProcess = overflow > 0 ? rows.slice(0, limit) : rows;
        const points = rowsToProcess
          .map((row, i) => ({
            ...row,
            lat: parseFloat(row[manualLatCol]),
            lng: parseFloat(row[manualLngCol]),
            _rowIndex: i,
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
        showCompleteStep(points, rowsToProcess, headers, [], overflow);
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
      const limit = getRowLimit(false, tier);
      const overflow = limit < Infinity && rows.length > limit ? rows.length - limit : 0;
      const rowsToProcess = overflow > 0 ? rows.slice(0, limit) : rows;
      const addressesToProcess = addresses.slice(0, rowsToProcess.length);
      const results = await geocodeAddresses(addressesToProcess, setProgress);
      const allMapped = rowsToProcess.map((row, i) => ({
        ...row,
        lat: results[i]?.lat ?? null,
        lng: results[i]?.lng ?? null,
        _geocodeConfidence: results[i]?.confidence ?? 0,
        _rowIndex: i,
      }));
      const points = allMapped.filter((p) => p.lat !== null && p.lng !== null);
      const geocodeFailed = rowsToProcess.filter((_, i) => results[i]?.lat == null);
      showCompleteStep(points, rowsToProcess, headers, geocodeFailed, overflow);
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  }

  const estSeconds = rows.length > 0 ? Math.round(rows.length * 0.2) : 0;

  return (
    <>
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
            {(tier === 'pro' || tier === 'enterprise') ? (
              <div style={{ ...tierBox, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <p style={{ ...tierBoxTitle, color: '#166534' }}>🔓 {TIERS[tier].label} — unlimited access</p>
              </div>
            ) : tier === 'free' ? (
              <div style={tierBox}>
                <p style={{ ...tierBoxTitle, margin: 0 }}>Free account limits</p>
                <div style={tierBoxRow}>
                  <span>Coordinate data (lat / lng columns)</span>
                  <span style={tierBoxValue}>{TIERS.free.maxLatLon.toLocaleString()} rows</span>
                </div>
                <div style={tierBoxRow}>
                  <span>Address geocoding</span>
                  <span style={tierBoxValue}>{TIERS.free.maxAddresses.toLocaleString()} rows</span>
                </div>
                <button style={tierUpgradeLink} onClick={() => onOpenUpgrade?.()}>
                  Need more? Upgrade →
                </button>
              </div>
            ) : (
              /* free_anonymous */
              <div style={tierBox}>
                <p style={{ ...tierBoxTitle, margin: 0 }}>Guest limits</p>
                <div style={tierBoxRow}>
                  <span>Coordinate data (lat / lng columns)</span>
                  <span style={tierBoxValue}>{TIERS.free_anonymous.maxLatLon.toLocaleString()} rows</span>
                </div>
                <div style={tierBoxRow}>
                  <span>Address geocoding</span>
                  <span style={tierBoxValue}>{TIERS.free_anonymous.maxAddresses.toLocaleString()} rows</span>
                </div>
                <button style={tierUpgradeLink} onClick={() => onOpenUpgrade?.()}>
                  Sign in free for higher limits →
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ marginTop: 12 }}
              onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        )}

        {/* ── REVIEW: coords ── */}
        {step === 'review' && mode === 'coords' && (() => {
          const limit = getRowLimit(true, tier);
          const willSlice = limit < Infinity && rows.length > limit;
          return (
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

              <p style={{ ...hint, marginTop: 8 }}>
                {rows.length.toLocaleString()} rows{willSlice && ` · First ${limit.toLocaleString()} will be analyzed`}
              </p>
              {willSlice && (
                <p style={limitWarning}>{getLimitWarning(rows.length - limit, limit)}</p>
              )}
              {error && <p style={errorStyle}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                <button style={primaryBtn} onClick={handleConfirm}>Next →</button>
                <button style={linkBtn} onClick={switchToAddressMode}>Use addresses instead →</button>
              </div>
              <button style={linkBtn} onClick={() => setMode('manual')}>None of these look right</button>
            </div>
          );
        })()}

        {/* ── REVIEW: address ── */}
        {step === 'review' && mode === 'address' && (() => {
          const limit = getRowLimit(false, tier);
          const willSlice = limit < Infinity && rows.length > limit;
          return (
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
                {rows.length.toLocaleString()} rows · ~{estSeconds}s to geocode{willSlice && ` · First ${limit.toLocaleString()} will be geocoded`}
              </p>
              {willSlice && (
                <p style={limitWarning}>{getLimitWarning(rows.length - limit, limit)}</p>
              )}
              {error && <p style={errorStyle}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                <button style={primaryBtn} onClick={handleConfirm}>Geocode &amp; Map</button>
              </div>
              <button style={linkBtn} onClick={() => setMode('manual')}>None of these look right</button>
            </div>
          );
        })()}

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

            {(() => {
              const isCoords = manualMode === 'coords';
              const limit = getRowLimit(isCoords, tier);
              const willSlice = limit < Infinity && rows.length > limit;
              return (
                <>
                  <p style={{ ...hint, marginTop: 10 }}>
                    {rows.length.toLocaleString()} rows
                    {!isCoords && ` · ~${estSeconds}s to geocode`}
                    {willSlice && ` · First ${limit.toLocaleString()} will be analyzed`}
                  </p>
                  {willSlice && (
                    <p style={limitWarning}>{getLimitWarning(rows.length - limit, limit)}</p>
                  )}
                  {error && <p style={errorStyle}>{error}</p>}
                  <button style={{ ...primaryBtn, marginTop: 6 }} onClick={handleConfirm}>
                    {isCoords ? 'Next →' : 'Geocode & Map'}
                  </button>
                </>
              );
            })()}
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

        {/* ── COMPLETE ── */}
        {step === 'complete' && pendingData && (
          <div style={body}>
            {pendingData.geocodeFailed?.length > 0 ? (
              <div style={geocodeReport}>
                <span>
                  ✓ {pendingData.points.length.toLocaleString()} of {(pendingData.points.length + pendingData.geocodeFailed.length).toLocaleString()} addresses geocoded
                  {' '}({Math.round(pendingData.points.length / (pendingData.points.length + pendingData.geocodeFailed.length) * 100)}%)
                  — <strong>{pendingData.geocodeFailed.length.toLocaleString()} failed</strong>
                </span>
                <button
                  style={linkBtn}
                  onClick={() => {
                    const csvRows = [pendingData.headers.join(','), ...pendingData.geocodeFailed.map((r) => pendingData.headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
                    const blob = new Blob([csvRows], { type: 'text/csv' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'failed-addresses.csv';
                    a.click();
                  }}
                >
                  Download failed rows ↓
                </button>
              </div>
            ) : (
              <p style={detectedBadge}>✓ {pendingData.points.length.toLocaleString()} points mapped</p>
            )}

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1c3557', display: 'block', marginBottom: 4 }}>
                Dataset name
              </label>
              <input
                style={{ ...sel, width: '100%', boxSizing: 'border-box' }}
                placeholder="e.g. Spring 2025 Program Participants"
                value={dataTitle}
                onChange={(e) => setDataTitle(e.target.value)}
                autoFocus
              />
            </div>

            <p style={{ ...hint, color: '#7a8fa6', fontSize: 12 }}>
              Your data will appear on the map. Enable boundary geographies from the panel on the left to begin analysis.
            </p>

            <button style={primaryBtn} onClick={handleMapData}>Map my data →</button>
          </div>
        )}
      </div>
    </div>

    </>
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
const tierBox = {
  marginTop: 10, padding: '10px 14px', background: '#f0f4f8',
  border: '1px solid #dde3ea', borderRadius: 6,
  display: 'flex', flexDirection: 'column', gap: 5,
};
const tierBoxTitle = { fontSize: 11, fontWeight: 700, color: '#7a8fa6', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 };
const tierBoxRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#1c3557' };
const tierBoxValue = { fontWeight: 700 };
const tierUpgradeLink = {
  background: 'none', border: 'none', padding: 0, margin: 0,
  fontSize: 11, color: 'var(--mid-blue)', cursor: 'pointer',
  textDecoration: 'underline', textAlign: 'left',
};
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

const geocodeReport = {
  fontSize: 12, color: '#92400e', background: '#fef3c7',
  border: '1px solid #fcd34d', borderRadius: 3,
  padding: '7px 10px', margin: 0,
  display: 'flex', flexDirection: 'column', gap: 4,
};
const limitWarning = {
  fontSize: 13, color: '#b91c1c', background: '#fee2e2',
  border: '1px solid #fca5a5', borderRadius: 3,
  padding: '7px 10px', margin: 0,
};
