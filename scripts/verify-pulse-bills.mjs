// Throwaway verification harness for pages/api/pulse/bills.js.
// Exercises the route handler directly with mocked fetch so we can deterministically
// hit the four scenarios without standing up Postgres + Clerk.
// DELETE after verification.

import handler from '../pages/api/pulse/bills.js';

// Make sure @vercel/postgres in policyCache.js fails fast (no DB in this harness);
// the route handler falls through to live fetch / seed, which is what we're testing.
process.env.POSTGRES_URL = '';

function makeReqRes(keywords) {
  const req = { method: 'GET', query: { state: 'NY', keywords } };
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(obj)    { body = obj; return this; },
    end()        { return this; },
  };
  return { req, res, get() { return { statusCode, body }; } };
}

const realFetch = global.fetch;
let fetchSpy;

function installFetch(fn) {
  fetchSpy = { calls: [] };
  global.fetch = async (url, init) => {
    fetchSpy.calls.push({ url, init });
    return fn(url, init);
  };
}

function restoreFetch() {
  global.fetch = realFetch;
}

function liveResponse(count = 3) {
  const results = Array.from({ length: count }, (_, i) => ({
    id: `ocd-bill/fake-${Math.random().toString(36).slice(2, 8)}-${i}`,
    identifier: `S ${1000 + i}`,
    title: `Fake bill ${i}`,
    abstracts: [{ abstract: `Abstract for fake bill ${i}` }],
    latest_action_description: 'Referred to committee',
    latest_action_date: '2026-01-15',
  }));
  return new Response(JSON.stringify({ results }), { status: 200, headers: { 'content-type': 'application/json' } });
}

async function scenario(label, fn) {
  console.log(`\n=== ${label} ===`);
  const t0 = performance.now();
  try {
    await fn();
  } catch (e) {
    console.log(`UNEXPECTED THROW: ${e.message}`);
  } finally {
    const ms = performance.now() - t0;
    console.log(`elapsed: ${ms.toFixed(0)} ms`);
  }
}

// ─── Scenario 1: 5× back-to-back identical scans, all complete ────────────────
await scenario('1. 5× back-to-back identical scans (live, then in-process cache miss → live each time since DB is mocked off)', async () => {
  // Cache layer can't hit DB (POSTGRES_URL empty → @vercel/postgres throws on read);
  // it falls through to seed (empty) → live. We expect 5 successful 200s with bills.
  installFetch(async () => liveResponse(3));
  for (let i = 1; i <= 5; i++) {
    const { req, res, get } = makeReqRes('immigration,legal aid,deportation');
    const t0 = performance.now();
    await handler(req, res);
    const ms = performance.now() - t0;
    const { statusCode, body } = get();
    console.log(`  scan ${i}: ${ms.toFixed(0)}ms · ${statusCode} · bills=${body.bills.length} · partial=${body.partial} · sources=${JSON.stringify(body.sources)}`);
  }
  console.log(`  total fetch calls: ${fetchSpy.calls.length} (expect 15 = 5 scans × 3 keywords)`);
  restoreFetch();
});

// ─── Scenario 2: one keyword wired to a bad host, others return ──────────────
await scenario('2. One keyword → bad host (TLS/conn error); others succeed; scan completes', async () => {
  let callCount = 0;
  installFetch(async (url) => {
    callCount++;
    // First keyword (=immigration) → simulate connection error
    if (url.includes('q=immigration')) {
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ENOTFOUND', message: 'bad-host' };
      throw err;
    }
    return liveResponse(3);
  });
  const { req, res, get } = makeReqRes('immigration,legal aid,deportation');
  const t0 = performance.now();
  await handler(req, res);
  const ms = performance.now() - t0;
  const { statusCode, body } = get();
  console.log(`  ${ms.toFixed(0)}ms · ${statusCode} · bills=${body.bills.length} · partial=${body.partial} · fulfilled=${body.keywordsFulfilled}/${body.keywordsRequested}`);
  console.log(`  fetch calls: ${callCount} (immigration retried once = 2, others = 1 each → expect 4)`);
  restoreFetch();
});

// ─── Scenario 3: total outage — every fetch fails ────────────────────────────
await scenario('3. Total outage (all 3 keyword fetches fail); degraded=true, never throws, no keys hint', async () => {
  installFetch(async () => {
    const err = new TypeError('fetch failed');
    err.cause = { code: 'ENOTFOUND', message: 'all-bad' };
    throw err;
  });
  const { req, res, get } = makeReqRes('immigration,legal aid,deportation');
  await handler(req, res);
  const { statusCode, body } = get();
  console.log(`  ${statusCode} · degraded=${body.degraded} · message=${JSON.stringify(body.message)}`);
  console.log(`  bills=${body.bills.length} (expect 0)`);
  restoreFetch();
});

// ─── Scenario 4: instant from cache ──────────────────────────────────────────
// To prove the cache path works, we seed lib/policyCacheSeed.js's SEED with
// known entries via dynamic import trick, then run a scan: expect zero fetch calls.
await scenario('4. Identical re-scan — seed cache hit; ZERO live calls', async () => {
  // Seed by mutating the SEED object at runtime
  const seedMod = await import('../lib/policyCacheSeed.js');
  seedMod.default['New York:2025-2026:immigration']  = [{ id: 'seed-1', identifier: 'S 1', title: 'Seeded bill 1', abstracts: [{ abstract: 'a' }] }];
  seedMod.default['New York:2025-2026:legal aid']    = [{ id: 'seed-2', identifier: 'S 2', title: 'Seeded bill 2', abstracts: [{ abstract: 'b' }] }];
  seedMod.default['New York:2025-2026:deportation']  = [{ id: 'seed-3', identifier: 'S 3', title: 'Seeded bill 3', abstracts: [{ abstract: 'c' }] }];

  installFetch(async () => {
    throw new Error('live fetch should never be called when seed has the keyword');
  });
  const { req, res, get } = makeReqRes('immigration,legal aid,deportation');
  const t0 = performance.now();
  await handler(req, res);
  const ms = performance.now() - t0;
  const { statusCode, body } = get();
  console.log(`  ${ms.toFixed(0)}ms · ${statusCode} · bills=${body.bills.length} · sources=${JSON.stringify(body.sources)}`);
  console.log(`  fetch calls: ${fetchSpy.calls.length} (expect 0)`);
  restoreFetch();
});

console.log('\nDone.');
