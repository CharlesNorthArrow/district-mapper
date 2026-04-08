// Client-side helpers for Policy Pulse

// [EXPAND] When adding states beyond NY, this mapping grows.
// Each state needs: jurisdiction name (for Open States), session string,
// and a function to build the source URL from bill identifier.
export const STATE_CONFIG = {
  NY: {
    jurisdiction: 'New York',
    session: '2025-2026',
    buildUrl: (identifier) => {
      // e.g. "S 3185" → "https://nysenate.gov/legislation/bills/2025/S3185"
      const clean = identifier.replace(/\s+/g, '');
      const year = '2025';
      return `https://nysenate.gov/legislation/bills/${year}/${clean}`;
    },
  },
  // [EXPAND] Add states here:
  // CA: { jurisdiction: 'California', session: '2025-2026', buildUrl: ... },
  // IL: { jurisdiction: 'Illinois',   session: '2025', buildUrl: ... },
};

// Derive state abbreviation from District Mapper layerId + district context
// [EXPAND] Currently hardcoded to NY. When multi-state support is added,
// pass stateFips from the existing STATE_FIPS lib and map to abbreviation.
export function getStateFromContext(stateFips) {
  // For Phase 1, always return NY
  // [EXPAND] Replace with: return FIPS_TO_ABBR[stateFips] || null;
  return 'NY';
}

// Map District Mapper layerIds to human-readable legislative level labels
export function getLevelLabel(layerId) {
  const map = {
    'congressional':   'Congressional',
    'us-senate':       'U.S. Senate',
    'state-senate':    'State Senate',
    'state-house':     'State Assembly', // [EXPAND] Label varies by state
    'school-unified':  'School District',
  };
  return map[layerId] || layerId;
}

// Determine if a layerId is eligible for Policy Pulse scanning
// Only legislative layers make sense — not school or ZIP layers
export function isScannableLayer(layerId) {
  return ['congressional', 'state-senate', 'state-house'].includes(layerId);
  // [EXPAND] Add state-specific layers as needed
}
