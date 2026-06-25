// One-shot: fetches canonical demo keywords from Open States once and writes
// them into lib/policyCacheSeed.js so demos never depend on the live API.
// Re-run any time you want to refresh the seed (then commit the diff).
//
// Canonical demo keywords match the example mission shown in
// components/PolicyPulse/OrgContextForm.js (legal services for low-income
// immigrants facing deportation in NYC).

import { writeFile } from 'node:fs/promises';

const KEY = process.env.OPEN_STATES_API_KEY;
if (!KEY) { console.error('OPEN_STATES_API_KEY missing'); process.exit(1); }

const JURISDICTION = 'New York';
const SESSION = '2025-2026';
const KEYWORDS = ['immigration', 'legal aid', 'deportation'];
const BASE = 'https://v3.openstates.org';

async function fetchKeyword(kw) {
  const url = `${BASE}/bills?jurisdiction=${encodeURIComponent(JURISDICTION)}&q=${encodeURIComponent(kw)}&per_page=20&include=abstracts`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'X-Api-Key': KEY }, signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`Open States ${res.status} for ${kw}`);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      lastErr = e;
      console.log(`  attempt ${attempt} failed: ${e.cause?.code || e.message}, retrying...`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

const seed = {};
for (const kw of KEYWORDS) {
  const cacheKey = `${JURISDICTION}:${SESSION}:${kw.toLowerCase()}`;
  console.log(`fetching ${cacheKey}...`);
  const results = await fetchKeyword(kw);
  seed[cacheKey] = results;
  console.log(`  ${results.length} results`);
}

const out = `// Bundled fallback cache for canonical demo keywords.
// Ships with the repo so demos never depend on the live Open States API.
// Populated by scripts/seed-policy-cache.mjs (one-shot, committed).
// Keys are { jurisdiction:session:keyword } — same shape as DB cache.

const SEED = ${JSON.stringify(seed, null, 2)};

export function lookupSeed(cacheKey) {
  return SEED[cacheKey] || null;
}

export default SEED;
`;

await writeFile(new URL('../lib/policyCacheSeed.js', import.meta.url), out);
console.log(`\nwrote lib/policyCacheSeed.js with ${Object.keys(seed).length} keyword entries`);
