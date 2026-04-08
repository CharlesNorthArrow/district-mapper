// GET /api/pulse/bills?state=NY&keywords=immigration,housing,legal+aid
// Searches Open States for bills matching keywords, deduplicates, returns
// up to 200 candidate bills with abstracts and sponsorships.
//
// [EXPAND] Currently only supports NY. When adding states:
//   1. Import STATE_CONFIG from lib/policyPulse (server-safe copy or duplicate)
//   2. Use state param to look up jurisdiction + session
//   3. Validate state is in supported list before querying

import { STATE_CONFIG } from '../../../lib/policyPulse';

const OPEN_STATES_BASE = 'https://v3.openstates.org';
const MAX_CANDIDATES = 200;
const PER_PAGE = 20;

// Module-level cache: { cacheKey: { bills, cachedAt } }
// [EXPAND] Replace with Vercel KV or Redis for multi-instance production cache
const cache = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function searchBills(jurisdiction, keyword) {
  // No session filter — let Open States return from the current session.
  // [EXPAND] Add &session=... once correct session strings per state are confirmed.
  const url = `${OPEN_STATES_BASE}/bills?jurisdiction=${encodeURIComponent(jurisdiction)}&q=${encodeURIComponent(keyword)}&per_page=${PER_PAGE}&include=abstracts&include=sponsorships`;

  const res = await fetch(url, {
    headers: { 'X-API-KEY': process.env.OPEN_STATES_API_KEY },
    signal: AbortSignal.timeout(30000),
  });

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
    // Parallel searches for all keywords
    const results = await Promise.all(
      keywordList.map(kw => searchBills(config.jurisdiction, kw))
    );

    // Deduplicate by bill ID
    const seen = new Set();
    const merged = [];
    for (const batch of results) {
      for (const bill of batch) {
        if (!seen.has(bill.id)) {
          seen.add(bill.id);
          merged.push({
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
          });
        }
        if (merged.length >= MAX_CANDIDATES) break;
      }
      if (merged.length >= MAX_CANDIDATES) break;
    }

    cache[cacheKey] = { bills: merged, cachedAt: Date.now() };
    return res.status(200).json({ bills: merged, fromCache: false });

  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
