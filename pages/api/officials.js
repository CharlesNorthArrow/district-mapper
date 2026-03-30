// Fetches current US House members from theunitedstates.io (no API key required).
// Returns { "IL|5": { name, party, url } } keyed by state abbreviation + district number.
// Cached in module scope for the lifetime of the server process.

let cache = null;

export default async function handler(req, res) {
  if (cache) return res.status(200).json(cache);
  try {
    const resp = await fetch(
      'https://theunitedstates.io/congress-legislators/legislators-current.json',
      { headers: { 'User-Agent': 'district-mapper/1.0' } }
    );
    if (!resp.ok) throw new Error(`Upstream HTTP ${resp.status}`);
    const data = await resp.json();

    const result = {};
    for (const member of data) {
      const lastTerm = member.terms[member.terms.length - 1];
      if (lastTerm.type !== 'rep') continue;
      const { state, district, party, url } = lastTerm;
      if (district == null) continue;
      const key = `${state}|${district}`;
      result[key] = {
        name: member.name.official_full || `${member.name.first} ${member.name.last}`,
        party: party ? party[0] : '?',  // 'D', 'R', 'I'…
        url: url || null,
      };
    }
    cache = result;
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
