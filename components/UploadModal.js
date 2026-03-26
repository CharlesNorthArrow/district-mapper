import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { geocodeAddresses } from '../lib/geocodeQueue';

const COORD_HEADERS = ['lat', 'lng', 'latitude', 'longitude', 'x', 'y'];

function detectCoordColumns(headers) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const lat = headers.find((_, i) =>
    lower[i] === 'lat' || lower[i] === 'latitude' || lower[i] === 'y'
  );
  const lng = headers.find((_, i) =>
    lower[i] === 'lng' || lower[i] === 'longitude' || lower[i] === 'x'
  );
  return { lat: lat || null, lng: lng || null };
}

function looksNumeric(values) {
  const sample = values.slice(0, 20).filter(Boolean);
  return sample.length > 0 && sample.every((v) => !isNaN(parseFloat(v)));
}

export default function UploadModal({ onClose, onUploadComplete }) {
  const [step, setStep] = useState('idle'); // idle | mapping | geocoding | done
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [latCol, setLatCol] = useState('');
  const [lngCol, setLngCol] = useState('');
  const [addressCol, setAddressCol] = useState('');
  const [mode, setMode] = useState(null); // 'coords' | 'address'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
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
    setRows(data);
    setHeaders(cols);

    const detected = detectCoordColumns(cols);
    if (detected.lat && detected.lng) {
      // Verify the values are actually numeric
      const latVals = data.map((r) => r[detected.lat]);
      const lngVals = data.map((r) => r[detected.lng]);
      if (looksNumeric(latVals) && looksNumeric(lngVals)) {
        setLatCol(detected.lat);
        setLngCol(detected.lng);
        setMode('coords');
        setStep('mapping');
        return;
      }
    }
    // Fall through to address column selection
    setMode('address');
    setStep('mapping');
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
      onUploadComplete(points, rows, headers);
    } else {
      if (!addressCol) {
        setError('Please select the address column.');
        return;
      }
      const addresses = rows.map((r) => String(r[addressCol] || ''));
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
        onUploadComplete(points, rows, headers);
      } catch (err) {
        setError(err.message);
        setStep('mapping');
      }
    }
  }

  const estimatedSeconds = rows.length > 0 ? (rows.length * 0.2).toFixed(0) : 0;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={{ fontSize: 16 }}>Upload Data</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {step === 'idle' && (
          <div style={body}>
            <p style={hint}>Upload a CSV or Excel file with addresses or coordinates.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ marginTop: 12 }}
              onChange={(e) => {
                if (e.target.files?.[0]) parseFile(e.target.files[0]);
              }}
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        )}

        {step === 'mapping' && mode === 'coords' && (
          <div style={body}>
            <p style={hint}>Coordinate columns detected:</p>
            <div style={fieldRow}>
              <label style={fieldLabel}>Latitude column</label>
              <select style={sel} value={latCol} onChange={(e) => setLatCol(e.target.value)}>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={fieldRow}>
              <label style={fieldLabel}>Longitude column</label>
              <select style={sel} value={lngCol} onChange={(e) => setLngCol(e.target.value)}>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <p style={hint}>{rows.length.toLocaleString()} rows will be mapped.</p>
            {error && <p style={errorStyle}>{error}</p>}
            <button style={primaryBtn} onClick={handleConfirm}>Map Points</button>
          </div>
        )}

        {step === 'mapping' && mode === 'address' && (
          <div style={body}>
            <p style={hint}>No coordinate columns found. Select the address field to geocode:</p>
            <div style={fieldRow}>
              <label style={fieldLabel}>Address column</label>
              <select style={sel} value={addressCol} onChange={(e) => setAddressCol(e.target.value)}>
                <option value="">— select —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <p style={hint}>
              {rows.length.toLocaleString()} rows — estimated ~{estimatedSeconds}s to geocode.
              {rows.length > 1000 && (
                <span style={{ color: 'var(--red)', marginLeft: 4 }}>
                  Large dataset — geocoding may take several minutes.
                </span>
              )}
            </p>
            {error && <p style={errorStyle}>{error}</p>}
            <button style={primaryBtn} onClick={handleConfirm} disabled={!addressCol}>
              Geocode &amp; Map
            </button>
          </div>
        )}

        {step === 'geocoding' && (
          <div style={body}>
            <p style={hint}>Geocoding {rows.length.toLocaleString()} addresses…</p>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${progress}%` }} />
            </div>
            <p style={{ ...hint, marginTop: 8 }}>{progress}% complete</p>
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
  width: 420, maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #dde3ea',
};
const closeBtn = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6',
};
const body = { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 };
const hint = { fontSize: 13, color: '#4a5568' };
const errorStyle = { fontSize: 13, color: 'var(--red)' };
const fieldRow = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 };
const fieldLabel = { fontSize: 13, minWidth: 140 };
const sel = { flex: 1, padding: '5px 8px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 13 };
const primaryBtn = {
  marginTop: 8, padding: '9px 18px',
  background: 'var(--red)', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  alignSelf: 'flex-start',
};
const progressTrack = {
  height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 8,
};
const progressFill = {
  height: '100%', background: 'var(--red)', borderRadius: 4,
  transition: 'width 0.3s ease',
};
