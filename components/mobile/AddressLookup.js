import { useState, useRef } from 'react';

const CENSUS_GEO_LABELS = {
  'Congressional Districts': 'U.S. House',
  'State Legislative Districts - Upper': 'State Senate',
  'State Legislative Districts - Lower': 'State House',
  'Counties': 'County',
};

export default function AddressLookup() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'suggesting' | 'loading' | 'done' | 'error' | 'no-match'
  const [matchedAddress, setMatchedAddress] = useState('');
  const [districts, setDistricts] = useState(null);
  const [copied, setCopied] = useState(null);
  const debounceRef = useRef(null);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setDistricts(null);
    setMatchedAddress('');
    setSuggestions([]);

    clearTimeout(debounceRef.current);
    if (!val.trim() || val.length < 4) { setStatus('idle'); return; }

    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  async function fetchSuggestions(q) {
    setStatus('suggesting');
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=US&types=address&autocomplete=true&limit=5`
      );
      if (!res.ok) throw new Error('suggestions failed');
      const data = await res.json();
      setSuggestions(data.features || []);
      setStatus('idle');
    } catch {
      setSuggestions([]);
      setStatus('idle');
    }
  }

  async function handleSelect(suggestion) {
    const addr = suggestion.place_name;
    setQuery(addr);
    setSuggestions([]);
    setStatus('loading');
    setDistricts(null);

    try {
      const res = await fetch(
        `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(addr)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`
      );
      if (!res.ok) throw new Error('Census geocoder error');
      const data = await res.json();

      const match = data.result?.addressMatches?.[0];
      if (!match) { setStatus('no-match'); return; }

      setMatchedAddress(match.matchedAddress);
      const geo = match.geographies || {};
      const result = [];

      for (const [geoKey, label] of Object.entries(CENSUS_GEO_LABELS)) {
        const entry = geo[geoKey]?.[0];
        if (entry) result.push({ label, name: entry.NAMELSAD || entry.NAME || entry.BASENAME || '' });
      }

      setDistricts(result);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div style={styles.container}>
      <p style={styles.label}>Look up any U.S. address</p>

      <div style={styles.inputWrap}>
        <input
          type="text"
          placeholder="123 Main St, City, State"
          value={query}
          onChange={handleQueryChange}
          style={styles.input}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {suggestions.length > 0 && (
          <ul style={styles.dropdown}>
            {suggestions.map((s) => (
              <li key={s.id} style={styles.dropdownItem} onMouseDown={() => handleSelect(s)}>
                {s.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === 'loading' && (
        <p style={styles.statusText}>Looking up districts…</p>
      )}

      {status === 'no-match' && (
        <p style={{ ...styles.statusText, color: '#e63947' }}>
          Address not found. Try a more complete address.
        </p>
      )}

      {status === 'error' && (
        <p style={{ ...styles.statusText, color: '#e63947' }}>
          Something went wrong. Check your connection and try again.
        </p>
      )}

      {status === 'done' && districts !== null && (
        <div style={styles.results}>
          <p style={styles.matchedAddress}>{matchedAddress}</p>
          {districts.length === 0 ? (
            <p style={styles.statusText}>No district data found for this address.</p>
          ) : (
            <ul style={styles.districtList}>
              {districts.map(({ label, name }) => (
                <li
                  key={label}
                  style={styles.districtRow}
                  onClick={() => handleCopy(name)}
                >
                  <span style={styles.districtLabel}>{label}</span>
                  <span style={styles.districtName}>
                    {copied === name ? '✓ Copied' : name}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p style={styles.tapHint}>Tap a row to copy the district name</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    marginTop: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1c3557',
    marginBottom: 8,
    fontFamily: "'Open Sans', sans-serif",
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #a9dadc',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'Open Sans', sans-serif",
    color: '#1c3557',
    outline: 'none',
    background: '#fff',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1.5px solid #a9dadc',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    listStyle: 'none',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxHeight: 200,
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '10px 14px',
    fontSize: 13,
    color: '#1c3557',
    fontFamily: "'Open Sans', sans-serif",
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  statusText: {
    fontSize: 13,
    color: '#467c9d',
    marginTop: 10,
    fontFamily: "'Open Sans', sans-serif",
  },
  results: {
    marginTop: 12,
    background: '#fff',
    borderRadius: 10,
    border: '1.5px solid #e0eeef',
    overflow: 'hidden',
  },
  matchedAddress: {
    fontSize: 11,
    color: '#7a8fa6',
    padding: '8px 14px 4px',
    fontFamily: "'Open Sans', sans-serif",
    borderBottom: '1px solid #f0f4f8',
  },
  districtList: {
    listStyle: 'none',
  },
  districtRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 14px',
    borderBottom: '1px solid #f0f4f8',
    cursor: 'pointer',
    gap: 8,
  },
  districtLabel: {
    fontSize: 12,
    color: '#7a8fa6',
    fontFamily: "'Open Sans', sans-serif",
    flexShrink: 0,
    minWidth: 90,
  },
  districtName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1c3557',
    fontFamily: "'Open Sans', sans-serif",
    textAlign: 'right',
  },
  tapHint: {
    fontSize: 11,
    color: '#aab8c5',
    textAlign: 'center',
    padding: '6px 14px 8px',
    fontFamily: "'Open Sans', sans-serif",
  },
};
