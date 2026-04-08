// POST /api/pulse/score
// Body: { missionText, bills[], districtName, level, repNames[] }
// Returns: scored bills[] sorted by relevance, filtered >= 40, capped at 25
//
// Claude scores all bills in a single prompt (batched).
// repNames are the reps for the user's district — used to flag sponsored bills.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { missionText, bills, districtName, level, repNames = [] } = req.body;

  if (!missionText || !bills?.length) {
    return res.status(400).json({ error: 'missionText and bills required' });
  }

  // Build a compact bill list for the prompt (title + abstract only)
  const billsForPrompt = bills.slice(0, 200).map(b => ({
    id: b.id,
    title: b.title,
    abstract: b.abstract,
  }));

  const prompt = `You are helping a nonprofit monitor state legislation relevant to their work.

Organization mission: ${JSON.stringify(missionText)}
Legislative scope: ${level} — ${districtName}

Score each bill for relevance to this organization's mission.
Return ONLY a valid JSON array. No preamble, no markdown, no explanation.
Be concise — keep each string field under 25 words.

For each bill, return:
{"id":"exact bill id","relevanceScore":0-100,"relevanceReason":"one short sentence","plainSummary":"one short sentence","suggestedAction":"one short sentence"}

Only include bills with relevanceScore >= 40. Sort descending. Stop after 25 results.

Bills:
${JSON.stringify(billsForPrompt)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0]?.text?.trim();
    const scored = JSON.parse(text.replace(/```json|```/g, '').trim());

    if (!Array.isArray(scored)) throw new Error('Expected array from Claude');

    // Merge scores back onto full bill objects (to restore url, sponsors, etc.)
    const billMap = Object.fromEntries(bills.map(b => [b.id, b]));
    const enriched = scored
      .slice(0, 25)
      .map(s => {
        const bill = billMap[s.id];
        if (!bill) return null;
        const primarySponsor = bill.sponsors?.find(sp => sp.primary);
        const sponsoredByRep = repNames.some(name =>
          bill.sponsors?.some(sp => sp.name.toLowerCase().includes(name.toLowerCase()))
        );
        return {
          ...bill,
          relevanceScore: s.relevanceScore,
          relevanceReason: s.relevanceReason,
          plainSummary: s.plainSummary,
          suggestedAction: s.suggestedAction,
          primarySponsor: primarySponsor?.name || null,
          sponsoredByYourRep: sponsoredByRep,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ bills: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
