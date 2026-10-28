// End-to-end flow in MOCK mode with the rule engine (no network).
process.env.NO_DOTENV = '1';
process.env.PAYPAL_CLIENT_ID = ''; process.env.SARVAM_API_KEY = ''; process.env.LLM_API_KEY = ''; process.env.AGENT_ENGINE = 'rules';
const test = require('node:test'); const assert = require('node:assert');
const server = require('../src/server');
test('chat -> book -> PayPal order -> capture -> PAID', async () => {
  await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}`;
  process.env.PUBLIC_BASE_URL = base;
  const say = (text) => fetch(base + '/api/chat', { method: 'POST', body: JSON.stringify({ sessionId: 't1', business: 'sunrise-clinic', text }) }).then((r) => r.json());
  assert.match((await say('hi')).reply, /Choose a service/);
  assert.match((await say('1')).reply, /Open times/);
  assert.match((await say('11:00')).reply, /name/);
  const r = await say('My name is Ravi');
  const link = r.reply.match(/(http\S+)/)[1];
  const ret = await fetch(link).then((x) => x.text());
  assert.match(ret, /successful/);
  const b = await fetch(base + '/api/bookings').then((x) => x.json());
  assert.equal(b[0].status, 'PAID');
  assert.match((await say('pay later')).reply, /invoice/i);
  server.close();
});
