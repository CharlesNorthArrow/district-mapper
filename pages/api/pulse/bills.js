// GET /api/pulse/bills?state=NY&keywords=immigration,housing,legal+aid
// Searches Open States for bills matching keywords, deduplicates, returns
// up to 200 candidate bills with abstracts and sponsorships.
//
// [EXPAND] Currently only supports NY. When adding states:
//   1. Import STATE_CONFIG from lib/policyPulse (server-safe copy or duplicate)
//   2. Use state param to look up jurisdiction + session
//   3. Validate state is in supported list before querying

export const config = { api: { maxDuration: 60 } };

import { STATE_CONFIG } from '../../../lib/policyPulse';

const OPEN_STATES_BASE = 'https://v3.openstates.org';
const MAX_CANDIDATES = 200;
const PER_PAGE = 20;

// Module-level cache: { cacheKey: { bills, cachedAt } }
// [EXPAND] Replace with Vercel KV or Redis for multi-instance production cache
const cache = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function searchBills(jurisdiction, keyword, attempt = 0) {
  // No session filter — let Open States return from the current session.
  // [EXPAND] Add &session=... once correct session strings per state are confirmed.
  const url = `${OPEN_STATES_BASE}/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&q=${encodeURIComponent(keyword)}&per_page=${PER_PAGE}&include=abstracts&include=sponsorships`;

  const headers = {};
  if (process.env.OPEN_STATES_API_KEY) headers['X-Api-Key'] = process.env.OPEN_STATES_API_KEY;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000),
  });

  // Retry once on 429/502/503 (transient Open States failures)
  if ((res.status === 429 || res.status === 502 || res.status === 503) && attempt === 0) {
    await new Promise(r => setTimeout(r, 1500));
    return searchBills(jurisdiction, keyword, 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Open States ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.results || [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // [EXPAND] When multi-state: validate state param against STATE_CONFIG keys
  const { state = 'NY', keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords param required' });

  const config = STATE_CONFIG[state];
  if (!config) {
    return res.status(400).json({
      error: `State ${state} not yet supported.`,
      // [EXPAND] This error surfaces in the UI as a "coming soon" message
    });
  }

  const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
  const cacheKey = `${state}:${keywordList.sort().join(',')}`;

  // Return cached result if fresh
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return res.status(200).json({ bills: cached.bills, fromCache: true });
  }

  try {
    // Parallel searches for all keywords.
    // allSettled so a single slow/failed keyword doesn't abort the whole scan.
    const settled = await Promise.allSettled(
      keywordList.map(kw => searchBills(config.jurisdiction, kw))
    );
    const results = settled
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (results.length === 0) {
      // Every keyword search failed — surface the first error
      const firstErr = settled.find(r => r.status === 'rejected');
      throw firstErr?.reason ?? new Error('All keyword searches failed');
    }

    // Pass 1 — collect all bills, count how many keyword searches each appears in
    const hitCount = {};
    const billData = {};
    for (const batch of results) {
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
            sponsors: (bill.sponsorships || []).map(s => ({
              name: s.name,
              primary: s.primary,
            })),
            url: config.buildUrl(bill.identifier),
          };
        }
      }
    }

    // Pass 2 — sort by hit count descending so the most cross-referenced bills
    // come first; within the same tier, first-seen order is preserved
    const merged = Object.values(billData)
      .sort((a, b) => (hitCount[b.id] || 0) - (hitCount[a.id] || 0))
      .slice(0, MAX_CANDIDATES);

    cache[cacheKey] = { bills: merged, cachedAt: Date.now() };
    return res.status(200).json({ bills: merged, fromCache: false });

  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
