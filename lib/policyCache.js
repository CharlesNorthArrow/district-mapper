// Postgres-backed per-keyword cache for Open States search results.
// Key shape: `${jurisdiction}:${session}:${keyword.toLowerCase()}`
// TTL is enforced on read so stale rows are simply ignored, not deleted.
// Cache is best-effort: read/write failures never block the request path.

import { sql } from '@vercel/postgres';
import { lookupSeed } from './policyCacheSeed';

const TTL_HOURS = 24;

export function buildKeywordCacheKey(jurisdiction, session, keyword) {
  return `${jurisdiction}:${session}:${keyword.trim().toLowerCase()}`;
}

export async function readKeywordCache(cacheKey) {
  try {
    const threshold = new Date(Date.now() - TTL_HOURS * 3600 * 1000);
    const { rows } = await sql`
      SELECT payload FROM policy_cache
      WHERE cache_key = ${cacheKey} AND created_at > ${threshold.toISOString()}
    `;
    if (rows[0]?.payload) return { source: 'db', results: rows[0].payload };
  } catch (err) {
    console.warn('[policyCache] db read failed:', err.message);
  }
  const seeded = lookupSeed(cacheKey);
  if (seeded) return { source: 'seed', results: seeded };
  return null;
}

export async function writeKeywordCache(cacheKey, payload) {
  try {
    await sql`
      INSERT INTO policy_cache (cache_key, payload, created_at)
      VALUES (${cacheKey}, ${JSON.stringify(payload)}::jsonb, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        created_at = NOW()
    `;
  } catch (err) {
    console.warn('[policyCache] db write failed:', err.message);
  }
}
