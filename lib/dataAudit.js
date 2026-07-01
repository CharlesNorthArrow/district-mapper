// Analyzes parsed spreadsheet data to detect coordinate columns, address fields,
// and single-column addresses. Combines header-name signal with cell-content
// heuristics and returns a per-role confidence + an overall proposal.
// Runs synchronously after file parse — no async, no server calls.

const LAT_HEADER = /lat(itude)?$|^y$/i;
const LAT_CONTAINS = /_lat(_|$)/i;
const LNG_HEADER = /lon(g(itude)?)?$|^lng$|^long$|^x$/i;
const LNG_CONTAINS = /(_lon|_lng)(_|$)/i;

const ADDRESS_ROLES = [
  { role: 'street', patterns: ['address', 'addr', 'street', 'streetaddress', 'address1', 'add1', 'streetaddr', 'addressline', 'addressline1', 'addr1'] },
  { role: 'city',   patterns: ['city', 'municipality', 'town', 'muni', 'locality'] },
  { role: 'county', patterns: ['county', 'co', 'parish'] },
  { role: 'state',  patterns: ['state', 'stateabbr', 'stateabbreviation', 'statecode', 'st', 'province', 'region'] },
  { role: 'zip',    patterns: ['zip', 'zipcode', 'zip_code', 'postal', 'postalcode', 'postalzip', 'zip5', 'postcode'] },
];

const SINGLE_FIELD_HEADER_PATTERNS = ['fulladdress', 'completeaddress', 'address', 'addressfull', 'mailingaddress', 'location', 'addressline'];

const SAMPLE_SIZE = 20;
const CONTENT_ROLE_WEIGHT = 0.65;
const HEADER_ROLE_WEIGHT = 0.35;
const ROLE_MIN_CONFIDENCE = 0.4;
const SINGLE_FIELD_MIN_SCORE = 0.7;

const US_STATE_ABBRS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','GU','VI','AS','MP',
]);

const US_STATE_NAMES = new Set([
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
  'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland',
  'massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire',
  'new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania',
  'rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington',
  'west virginia','wisconsin','wyoming','district of columbia','puerto rico',
]);

const STREET_SUFFIX_RE = /\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|pkwy|parkway|hwy|highway|cir|circle|ter|terrace|trl|trail|sq|square|aly|alley|row|loop)\b\.?/i;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const STARTS_WITH_NUMBER_RE = /^\s*\d+\s+\S/;

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[\s_\-]+/g, '');
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

// ─── Content classifiers ────────────────────────────────────────────────

function normalizeZipCandidate(v) {
  const s = String(v).trim();
  if (/^\d+$/.test(s) && s.length >= 3 && s.length <= 5) return s.padStart(5, '0');
  return s;
}

function zipContentScore(values) {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) {
    if (ZIP_RE.test(normalizeZipCandidate(v))) hits++;
  }
  return hits / values.length;
}

function stateContentScore(values) {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) {
    const upper = String(v).trim().toUpperCase();
    const lower = String(v).trim().toLowerCase();
    if (upper.length === 2 && US_STATE_ABBRS.has(upper)) hits++;
    else if (US_STATE_NAMES.has(lower)) hits++;
  }
  return hits / values.length;
}

function countyContentScore(values) {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) {
    const s = String(v).trim().toLowerCase();
    if (/\b(county|parish|borough)\b/.test(s)) hits++;
  }
  return hits / values.length;
}

function streetContentScore(values) {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) {
    const s = String(v).trim();
    if (STARTS_WITH_NUMBER_RE.test(s) && STREET_SUFFIX_RE.test(s)) hits++;
    else if (STARTS_WITH_NUMBER_RE.test(s)) hits += 0.5;
  }
  return Math.min(1, hits / values.length);
}

function cityContentScore(values) {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) {
    const s = String(v).trim();
    if (s.length < 2 || s.length > 40) continue;
    if (/^\d/.test(s)) continue;
    if (ZIP_RE.test(normalizeZipCandidate(s))) continue;
    const upper = s.toUpperCase();
    if (upper.length === 2 && US_STATE_ABBRS.has(upper)) continue;
    if (US_STATE_NAMES.has(s.toLowerCase())) continue;
    if (STREET_SUFFIX_RE.test(s) && STARTS_WITH_NUMBER_RE.test(s)) continue;
    if (/\b(county|parish|borough)\b/i.test(s)) continue;
    if (/^[A-Za-z][A-Za-z\s\-'.]{1,38}$/.test(s)) hits++;
    else if (/[A-Za-z]/.test(s) && !/^\d+$/.test(s)) hits += 0.3;
  }
  return Math.min(1, hits / values.length);
}

function singleFieldContentScore(values) {
  if (values.length === 0) return 0;
  let total = 0;
  for (const v of values) {
    const s = String(v).trim();
    if (s.length < 10) continue;
    const startsWithDigit = STARTS_WITH_NUMBER_RE.test(s) ? 1 : 0;
    const commaCount = (s.match(/,/g) || []).length;
    const commaScore = commaCount >= 2 ? 1 : commaCount === 1 ? 0.4 : 0;
    const tokens = s.split(/[\s,]+/);
    let stateHit = 0;
    for (const t of tokens) {
      const upper = t.toUpperCase();
      if (upper.length === 2 && US_STATE_ABBRS.has(upper)) { stateHit = 1; break; }
    }
    if (!stateHit) {
      const lower = s.toLowerCase();
      for (const name of US_STATE_NAMES) {
        if (lower.includes(name)) { stateHit = 1; break; }
      }
    }
    let zipHit = 0;
    for (const t of tokens) {
      if (ZIP_RE.test(t)) { zipHit = 1; break; }
    }
    const rowScore = startsWithDigit * 0.2 + commaScore * 0.25 + stateHit * 0.3 + zipHit * 0.25;
    total += Math.min(1, rowScore);
  }
  return total / values.length;
}

// ─── Header scoring ────────────────────────────────────────────────────

function headerRoleScore(header, role) {
  const norm = normalizeHeader(header);
  const roleDef = ADDRESS_ROLES.find((r) => r.role === role);
  if (!roleDef) return 0;
  if (roleDef.patterns.includes(norm)) return 1;
  for (const p of roleDef.patterns) {
    if (norm.length > p.length && norm.includes(p)) return 0.6;
  }
  return 0;
}

function singleFieldHeaderScore(header) {
  const norm = normalizeHeader(header);
  if (SINGLE_FIELD_HEADER_PATTERNS.includes(norm)) return 1;
  for (const p of SINGLE_FIELD_HEADER_PATTERNS) {
    if (norm.length > p.length && norm.includes(p)) return 0.6;
  }
  return 0;
}

// ─── Role assignment ───────────────────────────────────────────────────

function scoreAllColumns(headers, rows) {
  const perColumn = {};
  for (const col of headers) {
    const sample = getSample(rows, col, SAMPLE_SIZE);
    perColumn[col] = {
      sample,
      firstSample: sample[0] || '',
      content: {
        zip:         zipContentScore(sample),
        state:       stateContentScore(sample),
        county:      countyContentScore(sample),
        street:      streetContentScore(sample),
        city:        cityContentScore(sample),
        singleField: singleFieldContentScore(sample),
      },
    };
  }
  return perColumn;
}

function combineRoleConfidence(headerScore, contentScore) {
  return HEADER_ROLE_WEIGHT * headerScore + CONTENT_ROLE_WEIGHT * contentScore;
}

function assignRoles(headers, perColumn) {
  const roles = ['street', 'city', 'state', 'zip', 'county'];
  const candidates = {};
  for (const role of roles) {
    candidates[role] = headers
      .map((col) => {
        const hScore = headerRoleScore(col, role);
        const cScore = perColumn[col].content[role];
        return { col, score: combineRoleConfidence(hScore, cScore), headerHit: hScore, contentHit: cScore };
      })
      .filter((c) => c.score >= ROLE_MIN_CONFIDENCE)
      .sort((a, b) => b.score - a.score);
  }

  const assigned = { street: null, city: null, state: null, zip: null, county: null };
  const takenCols = new Set();

  const roleOrder = ['zip', 'state', 'street', 'county', 'city'];
  for (const role of roleOrder) {
    for (const c of candidates[role]) {
      if (!takenCols.has(c.col)) {
        assigned[role] = {
          col: c.col,
          sample: perColumn[c.col].firstSample,
          confidence: Math.round(c.score * 100),
          headerHit: c.headerHit,
          contentHit: c.contentHit,
        };
        takenCols.add(c.col);
        break;
      }
    }
  }
  return assigned;
}

function computeMultiFieldConfidence(assigned) {
  const roleScores = [];
  if (assigned.street) roleScores.push(assigned.street.confidence);
  if (assigned.city) roleScores.push(assigned.city.confidence);
  if (assigned.state) roleScores.push(assigned.state.confidence);
  if (assigned.zip) roleScores.push(assigned.zip.confidence);
  if (roleScores.length === 0) return 0;

  let base = roleScores.reduce((a, b) => a + b, 0) / roleScores.length;
  if (assigned.street && assigned.city && assigned.state && assigned.zip) base += 10;
  if (!assigned.street) base -= 20;
  if (!assigned.state) base -= 15;
  if (!assigned.zip) base -= 15;
  if (!assigned.city) base -= 10;
  return Math.max(0, Math.min(100, Math.round(base)));
}

function findBestSingleField(headers, perColumn) {
  let best = null;
  for (const col of headers) {
    const contentScore = perColumn[col].content.singleField;
    const headerScore = singleFieldHeaderScore(col);
    const combined = HEADER_ROLE_WEIGHT * headerScore + CONTENT_ROLE_WEIGHT * contentScore;
    if (!best || combined > best.score) {
      best = { col, score: combined, contentScore, headerScore, sample: perColumn[col].firstSample };
    }
  }
  return best;
}

function buildMultiFieldPreview(assigned, rows) {
  const orderedCols = ['street', 'city', 'state', 'zip']
    .map((r) => assigned[r]?.col)
    .filter(Boolean);
  if (orderedCols.length === 0) return '';
  for (const row of rows) {
    const parts = orderedCols.map((c) => String(row[c] || '').trim()).filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }
  return '';
}

function buildSingleFieldPreview(col, rows) {
  for (const row of rows) {
    const v = String(row[col] || '').trim();
    if (v) return v;
  }
  return '';
}

function buildProposal(headers, rows, coordResult) {
  if (coordResult.confidence !== null) {
    return {
      mode: 'coords',
      confidence: coordResult.confidence === 'high' ? 100 : 70,
      roles: null,
      singleFieldCol: null,
      preview: '',
    };
  }

  const perColumn = scoreAllColumns(headers, rows);
  const assigned = assignRoles(headers, perColumn);
  const multiConfidence = computeMultiFieldConfidence(assigned);
  const bestSingle = findBestSingleField(headers, perColumn);

  const singleWins =
    bestSingle &&
    bestSingle.contentScore >= SINGLE_FIELD_MIN_SCORE &&
    Math.round(bestSingle.score * 100) >= multiConfidence;

  if (singleWins) {
    return {
      mode: 'singleField',
      confidence: Math.round(bestSingle.score * 100),
      roles: null,
      singleFieldCol: bestSingle.col,
      singleFieldSample: bestSingle.sample,
      preview: buildSingleFieldPreview(bestSingle.col, rows),
    };
  }

  const hasAnyRole = assigned.street || assigned.city || assigned.state || assigned.zip;
  if (hasAnyRole && multiConfidence > 0) {
    return {
      mode: 'address',
      confidence: multiConfidence,
      roles: assigned,
      singleFieldCol: null,
      preview: buildMultiFieldPreview(assigned, rows),
    };
  }

  return {
    mode: 'manual',
    confidence: 0,
    roles: null,
    singleFieldCol: null,
    preview: '',
  };
}

function detectAddressFields(headers, rows, proposal) {
  // Backward-compatible list of detected roles derived from the proposal.
  const detected = [];
  if (proposal.mode === 'address' && proposal.roles) {
    for (const role of ['street', 'city', 'county', 'state', 'zip']) {
      const r = proposal.roles[role];
      if (r) detected.push({ role, col: r.col, sample: r.sample });
    }
    return { detected };
  }
  // Fallback: legacy header-only detection when no proposal roles exist.
  const normalized = headers.map(normalizeHeader);
  for (const { role, patterns } of ADDRESS_ROLES) {
    for (let i = 0; i < headers.length; i++) {
      if (patterns.includes(normalized[i])) {
        const sample = getSample(rows, headers[i], 1)[0] || '';
        detected.push({ role, col: headers[i], sample });
        break;
      }
    }
  }
  return { detected };
}

export function auditData(headers, rows) {
  const coordResult = detectCoords(headers, rows);
  const proposal = buildProposal(headers, rows, coordResult);
  const addressResult = {
    ...detectAddressFields(headers, rows, proposal),
    proposal,
  };
  return {
    rowCount: rows.length,
    coordResult,
    addressResult,
  };
}
