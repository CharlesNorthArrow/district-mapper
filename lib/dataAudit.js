// Analyzes parsed spreadsheet data to detect coordinate columns and address fields.
// Called synchronously after file parse — no async, no server calls.

const LAT_HEADER = /lat(itude)?$|^y$/i;
const LAT_CONTAINS = /_lat(_|$)/i;
const LNG_HEADER = /lon(g(itude)?)?$|^lng$|^long$|^x$/i;
const LNG_CONTAINS = /(_lon|_lng)(_|$)/i;

const ADDRESS_ROLES = [
  { role: 'street', patterns: ['address', 'addr', 'street', 'streetaddress', 'address1', 'add1', 'streetaddr'] },
  { role: 'city',   patterns: ['city', 'municipality', 'town', 'muni'] },
  { role: 'county', patterns: ['county', 'co'] },
  { role: 'state',  patterns: ['state', 'stateabbr', 'stateabbreviation', 'statecode'] },
  { role: 'zip',    patterns: ['zip', 'zipcode', 'zip_code', 'postal', 'postalcode', 'postalzip'] },
];

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[\s_\-]+/g, '');
}

function getSample(rows, col, n = 3) {
  const vals = [];
  for (const row of rows) {
    if (vals.length >= n) break;
    const v = row[col];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      vals.push(String(v).trim());
    }
  }
  return vals;
}

function isLatHeader(h) {
  return LAT_HEADER.test(h) || LAT_CONTAINS.test(h);
}

function isLngHeader(h) {
  return LNG_HEADER.test(h) || LNG_CONTAINS.test(h);
}

function validateCoordValues(rows, col, min, max) {
  const vals = [];
  for (const row of rows) {
    if (vals.length >= 20) break;
    const v = row[col];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      vals.push(String(v).trim());
    }
  }
  if (vals.length === 0) return { valid: false, borderline: false };
  const nums = vals.map(parseFloat);
  if (nums.some(isNaN)) return { valid: false, borderline: false };
  if (nums.every((n) => n >= min && n <= max)) {
    // "borderline": all values are small integers (could be row IDs, not coordinates)
    const allSmallInt = nums.every((n) => Number.isInteger(n) && Math.abs(n) < 100);
    return { valid: true, borderline: allSmallInt };
  }
  return { valid: false, borderline: false };
}

function detectCoords(headers, rows) {
  const latCandidates = headers.filter(isLatHeader);
  const lngCandidates = headers.filter(isLngHeader);

  for (const latCol of latCandidates) {
    for (const lngCol of lngCandidates) {
      if (latCol === lngCol) continue;
      const latCheck = validateCoordValues(rows, latCol, -90, 90);
      const lngCheck = validateCoordValues(rows, lngCol, -180, 180);
      if (latCheck.valid && lngCheck.valid) {
        const borderline = latCheck.borderline || lngCheck.borderline;
        return {
          confidence: borderline ? 'possible' : 'high',
          latCol,
          lngCol,
          latSample: getSample(rows, latCol),
          lngSample: getSample(rows, lngCol),
        };
      }
    }
  }
  return { confidence: null, latCol: null, lngCol: null, latSample: [], lngSample: [] };
}

function detectAddressFields(headers, rows) {
  const normalized = headers.map(normalizeHeader);
  const detected = [];

  for (const { role, patterns } of ADDRESS_ROLES) {
    for (let i = 0; i < headers.length; i++) {
      if (patterns.includes(normalized[i])) {
        const sample = getSample(rows, headers[i], 1)[0] || '';
        detected.push({ role, col: headers[i], sample });
        break; // one column per role
      }
    }
  }
  return { detected };
}

export function auditData(headers, rows) {
  return {
    rowCount: rows.length,
    coordResult: detectCoords(headers, rows),
    addressResult: detectAddressFields(headers, rows),
  };
}
