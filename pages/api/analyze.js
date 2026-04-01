import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { totalPoints, headers, sampleRows, layers } = req.body;

  if (!layers?.length) {
    return res.status(400).json({ error: 'No boundary layers provided' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const layerSummaries = layers.map((layer) => {
    const topList = layer.topDistricts
      .slice(0, 5)
      .map((d) => `  - ${d.name}: ${d.count} records (${d.pct}%)`)
      .join('\n');
    const unmatchedNote = layer.totalUnmatched > 0
      ? `  - ${layer.totalUnmatched} records did not match any district\n`
      : '';
    return `${layer.displayName} (${layer.totalMatched} of ${totalPoints} matched):\n${topList}\n${unmatchedNote}`;
  }).join('\n');

  const sampleBlock = sampleRows?.length
    ? `Here are a few sample rows to understand the data:\n${JSON.stringify(sampleRows.slice(0, 15), null, 2)}\n\n`
    : '';

  const prompt = `You are analyzing constituent or program data for a nonprofit organization.

The dataset has ${totalPoints} records with the following columns: ${headers.join(', ')}.

${sampleBlock}Geographic distribution by boundary layer:
${layerSummaries}

Write 2–3 short paragraphs in plain English for a nonprofit staff member who is not a data analyst. Cover:
1. Where the organization's people or program participants are geographically concentrated
2. Notable distribution patterns — whether participants are concentrated in a few districts or spread broadly
3. What this distribution might mean for the organization's outreach, advocacy, or program delivery

Be specific — use district names and numbers. Avoid jargon. Keep it concise and actionable. Do not use headers or bullet points; write in flowing paragraphs.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0]?.text;
    if (!text) throw new Error('Empty response from API');

    return res.status(200).json({ text });
  } catch (err) {
    console.error('analyze API error:', err.message);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
}
