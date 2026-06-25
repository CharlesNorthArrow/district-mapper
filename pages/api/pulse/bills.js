// GET /api/pulse/bills?state=NY&keywords=immigration,housing,legal+aid
//
// Searches Open States for bills matching keywords. Resilient design:
//  - Drop include=sponsorships (unused downstream — score.js only reads abstract).
//  - Cap keywords searched at 3 to limit parallel exposure to OS tail latency.
//  - Per-call: 20s timeout, single retry only on connection/TLS errors or 5xx/429
//    (NOT on our own timeout — retrying a timed-out call just doubles the wait).
//  - Quorum: resolve as soon as MIN_QUORUM keyword searches succeed or the
//    STEP_SOFT_DEADLINE_MS elapses. Drop stragglers. Step never throws.
//  - Per-keyword cache (Postgres + bundled seed) is the main reliability lever.
//
// [EXPAND] Multi-state: STATE_CONFIG already keys by state — add entries there.

import { STATE_CONFIG } from '../../../lib/policyPulse';
import {
  buildKeywordCacheKey,
  readKeywordCache,
  writeKeywordCache,
} from '../../../lib/policyCache';

const OPEN_STATES_BASE = 'https://v3.openstates.org';
const PER_PAGE = 20;
const MAX_KEYWORDS = 3;
const PER_CALL_TIMEOUT_MS = 20000;
const PER_CALL_TOTAL_BUDGET_MS = 22000;
const STEP_SOFT_DEADLINE_MS = 28000;
const MIN_QUORUM = 2;
const MERGED_CAP = 40;

function isRetryable(err) {
  if (err?.status === 429 || (err?.status >= 500 && err?.status < 600)) return true;
  // Our own per-call timeout — NOT retryable (just doubles the wait).
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return false;
  const code = err?.cause?.code || err?.code;
  if (code && ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'UND_ERR_SOCKET'].includes(code)) return true;
  const causeMsg = err?.cause?.message || '';
  if (causeMsg.includes('certificate') || causeMsg.includes('TLS')) return true;
  return false;
}

async function fetchOnce(url, headers, timeoutMs) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const e = new Error(`Open States ${res.status}: ${body.slice(0, 200)}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return data.results || [];
}

async function searchKeywordLive(jurisdiction, keyword) {
  const url = `${OPEN_STATES_BASE}/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&q=${encodeURIComponent(keyword)}&per_page=${PER_PAGE}&include=abstracts`;
  const headers = {};
  if (process.env.OPEN_STATES_API_KEY) headers['X-Api-Key'] = process.env.OPEN_STATES_API_KEY;

  const start = Date.now();
  try {
    return await fetchOnce(url, headers, PER_CALL_TIMEOUT_MS);
  } catch (err) {
    const elapsed = Date.now() - start;
    const remaining = PER_CALL_TOTAL_BUDGET_MS - elapsed;
    if (remaining > 500 && isRetryable(err)) {
      await new Promise(r => setTimeout(r, Math.min(750, remaining - 100)));
      const retryRemaining = PER_CALL_TOTAL_BUDGET_MS - (Date.now() - start);
      if (retryRemaining > 500) {
        return await fetchOnce(url, headers, retryRemaining);
      }
    }
    throw err;
  }
}

async function searchKeyword(jurisdiction, session, keyword) {
  const cacheKey = buildKeywordCacheKey(jurisdiction, session, keyword);
  const cached = await readKeywordCache(cacheKey);
  if (cached) return { source: cached.source, results: cached.results };
  const results = await searchKeywordLive(jurisdiction, keyword);
  writeKeywordCache(cacheKey, results).catch(() => {});
  return { source: 'live', results };
}

// Resolves as soon as `minQuorum` promises fulfill, OR all settle, OR `deadlineMs`
// elapses — whichever is first. Returns an array shaped like Promise.allSettled.
// Unsettled slots at the deadline become { status: 'rejected', reason: <dropped> }.
function raceQuorum(promises, { minQuorum, deadlineMs }) {
  return new Promise(resolve => {
    const n = promises.length;
    const effectiveQuorum = Math.min(minQuorum, n);
    const results = new Array(n);
    let fulfilled = 0;
    let settled = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      for (let i = 0; i < n; i++) {
        if (!results[i]) results[i] = { status: 'rejected', reason: new Error('dropped: deadline or quorum') };
      }
      resolve(results);
    };

    const timer = setTimeout(finish, deadlineMs);

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        value => {
          results[i] = { status: 'fulfilled', value };
          fulfilled++; settled++;
          if (fulfilled >= effectiveQuorum || settled === n) { clearTimeout(timer); finish(); }
        },
        reason => {
          results[i] = { status: 'rejected', reason };
          settled++;
          if (settled === n) { clearTimeout(timer); finish(); }
        }
      );
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { state = 'NY', keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords param required' });

  const config = STATE_CONFIG[state];
  if (!config) return res.status(400).json({ error: `State ${state} not yet supported.` });

  const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, MAX_KEYWORDS);
  if (!keywordList.length) return res.status(400).json({ error: 'no usable keywords' });

  const settled = await raceQuorum(
    keywordList.map(kw => searchKeyword(config.jurisdiction, config.session, kw)),
    { minQuorum: MIN_QUORUM, deadlineMs: STEP_SOFT_DEADLINE_MS }
  );

  const fulfilled = settled.filter(s => s.status === 'fulfilled');
  const fulfilledBatches = fulfilled.map(s => s.value.results);
  const sources = fulfilled.map(s => s.value.source);

  if (fulfilledBatches.length === 0) {
    return res.status(200).json({
      bills: [],
      degraded: true,
      message: "Couldn't reach the legislation database just now — try again in a moment.",
    });
  }

  const hitCount = {};
  const billData = {};
  for (const batch of fulfilledBatches) {
    for (const bill of batch) {
      hitCount[bill.id] = (hitCount[bill.id] || 0) + 1;
      if (!billData[bill.id]) {
        billData[bill.id] = {
          id: bill.id,
          identifier: bill.identifier,
          title: bill.title,
          abstract: bill.abstracts?.[0]?.abstract || bill.title,
          status: bill.latest_action_description || 'Unknown',
          lastActionDate: bill.latest_action_date || null,
          sponsors: [],
          url: config.buildUrl(bill.identifier),
        };
      }
    }
  }

  const merged = Object.values(billData)
    .sort((a, b) => (hitCount[b.id] || 0) - (hitCount[a.id] || 0))
    .slice(0, MERGED_CAP);

  const partial = fulfilledBatches.length < keywordList.length;
  return res.status(200).json({
    bills: merged,
    partial,
    keywordsRequested: keywordList.length,
    keywordsFulfilled: fulfilledBatches.length,
    sources,
  });
}
