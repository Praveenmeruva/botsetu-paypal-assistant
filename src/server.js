// BotSetu PayPal assistant: zero-dependency Node HTTP server.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load .env if present (no dependency needed)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]] && m[2]) process.env[m[1]] = m[2];
}

const paypal = require('./paypal');
const agent = require('./agent');
const store = require('./store');
const catalog = require('./catalog');

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch { ok({}); } }); });

function getSession(id, business) {
  if (!store.sessions.has(id)) store.sessions.set(id, { business: catalog[business] ? business : 'sunrise-clinic', history: [], outbox: [] });
  return store.sessions.get(id);
}

async function capture(bookingId, orderId) {
  const b = store.bookings.get(bookingId) || store.bookings.get(store.byOrder.get(orderId));
  if (!b) throw new Error('Booking not found');
  if (b.status === 'PAID') return b;
  const r = await paypal.captureOrder(b.orderId || orderId);
  if (r.status === 'COMPLETED') {
    b.status = 'PAID'; b.captureId = r.captureId; b.paidAt = new Date().toISOString();
    const s = store.sessions.get(b.session);
    if (s) s.outbox.push(`✅ Payment received via PayPal (capture ${r.captureId}). Booking ${b.id} confirmed: ${b.service}, ${b.date} ${b.slot}.`);
  }
  return b;
}

const page = (title, body) => `<!doctype html><meta name=viewport content="width=device-width"><title>${title}</title><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:0 16px">${body}</body>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard')) {
      const f = url.pathname === '/' ? 'index.html' : 'dashboard.html';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, '..', 'public', f)));
    }
    if (url.pathname === '/api/config') return json(res, 200, { mock: paypal.MOCK, env: paypal.ENV, businesses: Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, v.name])) });
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const { sessionId, business, text } = await readBody(req);
      if (!sessionId || !text) return json(res, 400, { error: 'sessionId and text required' });
      const s = getSession(sessionId, business);
      const out = await agent.handle(s, String(text).slice(0, 1000), { business: s.business, sessionId });
      return json(res, 200, { ...out, lang: s.lang });
    }
    if (url.pathname === '/api/outbox') { // chat polls for async payment confirmations
      const s = store.sessions.get(url.searchParams.get('sessionId'));
      return json(res, 200, { messages: s ? s.outbox.splice(0) : [] });
    }
    if (url.pathname === '/api/bookings') return json(res, 200, [...store.bookings.values()].reverse());
    if (url.pathname === '/paypal/return') {
      const b = await capture(url.searchParams.get('booking'), url.searchParams.get('token'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(page('Paid', `<h2>✅ Payment ${b.status === 'PAID' ? 'successful' : b.status}</h2><p>${b.service}<br>${b.date} ${b.slot}<br>Booking ${b.id}<br>PayPal capture ${b.captureId || '-'}</p><p>You can close this tab and return to the chat.</p>`));
    }
    if (url.pathname === '/paypal/cancel') {
      const b = store.bookings.get(url.searchParams.get('booking')); if (b) b.status = 'CANCELLED';
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page('Cancelled', '<h2>Payment cancelled</h2><p>Your slot was released. Return to the chat to try again.</p>'));
    }
    if (req.method === 'POST' && url.pathname === '/paypal/webhook') {
      // Handles CHECKOUT.ORDER.APPROVED (e.g. buyer closed the tab before redirect). Configure in the PayPal app.
      const ev = await readBody(req);
      if (ev.event_type === 'CHECKOUT.ORDER.APPROVED') await capture(null, ev.resource?.id).catch((e) => console.warn(e.message));
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/webhook/whatsapp') {
      // Simplified channel adapter: {from, text, business} -> {reply}. Wire to Meta Cloud API / BSP in production.
      const { from, text, business } = await readBody(req);
      const s = getSession('wa:' + from, business);
      const out = await agent.handle(s, String(text || ''), { business: s.business, sessionId: 'wa:' + from });
      return json(res, 200, { to: from, reply: out.reply });
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e); json(res, 500, { error: e.message });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`BotSetu assistant on http://localhost:${port}  (PayPal: ${paypal.MOCK ? 'MOCK mode – set PAYPAL_CLIENT_ID/SECRET for sandbox' : paypal.ENV})`));
}
module.exports = server;
