// POST /api/pulse/keywords
// Body: { missionText }
// Returns: { keywords: string[] }
// Uses Claude to extract 3-5 search-ready keywords from org mission text.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { missionText } = req.body;
  if (!missionText?.trim()) {
    return res.status(400).json({ error: 'missionText required' });
  }

  const prompt = `Extract 3 to 5 short search keywords from this nonprofit mission description.
These keywords will be used to search a state legislative database for relevant bills.
Return only a JSON array of strings. No preamble, no explanation.
Each keyword should be 1-3 words, specific, and policy-relevant.

Mission: ${JSON.stringify(missionText)}

Example output: ["immigration", "tenant rights", "legal aid", "housing", "deportation"]`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0]?.text?.trim();
    const keywords = JSON.parse(text.replace(/```json|```/g, '').trim());

    if (!Array.isArray(keywords)) throw new Error('Expected array');

    return res.status(200).json({ keywords });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
