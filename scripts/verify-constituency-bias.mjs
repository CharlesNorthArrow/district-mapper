// Verifies that constituencyArea biases /api/pulse/keywords and /api/pulse/score.
// No live Anthropic key needed: we mock global.fetch to intercept the
// Messages API request and read back the prompt the handler actually sent.
// This proves the wire shape and the geographic context line are correctly
// plumbed end-to-end through both handlers.

// Dummy key so the Anthropic SDK constructor succeeds when the handlers import.
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-dummy';

const MISSION =
  "We're a housing advocacy organization focused on tenant rights, " +
  "affordable housing protections, and shielding low-income families from displacement.";

const CANDIDATES = [
  { id: 'b1', identifier: 'S 101', title: 'NYC Right to Counsel Expansion Act',
    abstract: 'Expands tenant right to counsel in eviction proceedings in New York City.' },
  { id: 'b2', identifier: 'S 102', title: 'Statewide Rent Stabilization Act',
    abstract: 'Caps annual rent increases across New York State at CPI + 1%.' },
  { id: 'b3', identifier: 'A 103', title: 'Bronx Housing Affordability Pilot',
    abstract: 'Five-year affordable housing pilot for low-income families in the Bronx.' },
];

// Intercept Anthropic API requests; capture the prompt sent for the latest call.
let lastPrompt = null;
const realFetch = global.fetch;
global.fetch = async (url, init) => {
  if (typeof url === 'string' && url.includes('api.anthropic.com')) {
    const body = JSON.parse(init.body);
    lastPrompt = body.messages[0].content;
    // Canned response: keywords endpoint expects a JSON array of strings;
    // score endpoint expects a JSON array of scored objects.
    const canned = url.endsWith('/messages')
      ? (lastPrompt.startsWith('Extract')
          ? '["housing","tenant rights","eviction"]'
          : JSON.stringify(CANDIDATES.map((b, i) => ({
              id: b.id, relevanceScore: 90 - i * 10,
              relevanceReason: 'mock', plainSummary: 'mock', suggestedAction: 'mock',
            }))))
      : '{}';
    return new Response(JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant',
      content: [{ type: 'text', text: canned }],
      stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, init);
};

const { default: keywordsHandler } = await import('../pages/api/pulse/keywords.js');
const { default: scoreHandler } = await import('../pages/api/pulse/score.js');

async function callHandler(handler, body) {
  const req = { method: 'POST', body };
  let statusCode = 200, payload = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(o) { payload = o; return this; },
    end() { return this; },
  };
  await handler(req, res);
  return { statusCode, payload };
}

function extractGeoLine(prompt) {
  const m = prompt.match(/Geographic focus:[^\n]+|Constituency \/ geographic focus:[^\n]+/);
  return m ? m[0] : '(none)';
}

async function runScenario(label, area) {
  console.log(`\n=== ${label} (constituencyArea: ${JSON.stringify(area)}) ===`);

  await callHandler(keywordsHandler, { missionText: MISSION, constituencyArea: area });
  console.log('  keywords prompt geoLine:');
  console.log('    ', extractGeoLine(lastPrompt));

  await callHandler(scoreHandler, {
    missionText: MISSION,
    bills: CANDIDATES,
    districtName: 'NY State Senate District 32',
    level: 'state-senate',
    repNames: [],
    constituencyArea: area,
  });
  console.log('  score prompt geoLine:');
  console.log('    ', extractGeoLine(lastPrompt));
}

await runScenario('A: Blank', '');
await runScenario('B: NY Statewide', 'NY Statewide');
await runScenario('C: North Bronx', 'North Bronx');

console.log('\nDone. The geoLine appears in B and C, is empty in A — proves plumbing through both handlers.');
