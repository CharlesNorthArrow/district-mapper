// Bundled fallback cache for canonical demo keywords.
// Ships with the repo so demos never depend on the live Open States API.
// Populated by scripts/seed-policy-cache.mjs (one-shot, committed).
// Keys are { jurisdiction:session:keyword } — same shape as DB cache.

const SEED = {
  // populated by scripts/seed-policy-cache.mjs
};

export function lookupSeed(cacheKey) {
  return SEED[cacheKey] || null;
}

export default SEED;
