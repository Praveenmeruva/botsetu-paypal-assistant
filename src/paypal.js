// PayPal REST client: OAuth2, Orders v2 (create/get/capture), Invoicing v2 (create/send).
// Falls back to an in-memory MOCK when sandbox credentials are not set.
const crypto = require('crypto');

const ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const BASE = ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const MOCK = !(CLIENT_ID && CLIENT_SECRET);

let token = null, tokenExp = 0;
const mockOrders = new Map();

async function getToken() {
  if (token && Date.now() < tokenExp - 60_000) return token;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000;
  return token;
}

async function api(method, path, body, extraHeaders = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`PayPal ${method} ${path} -> ${res.status}: ${text}`);
  return data;
}

const money = (v) => Number(v).toFixed(2);

async function createOrder({ referenceId, description, amount, currency, returnUrl, cancelUrl }) {
  if (MOCK) {
    const id = 'MOCK-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    mockOrders.set(id, { id, status: 'CREATED', amount: money(amount), currency, referenceId });
    return { id, status: 'CREATED', approveUrl: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${id}&mock=1`, mock: true };
  }
  const order = await api('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: referenceId,
      description: description.slice(0, 127),
      amount: { currency_code: currency, value: money(amount) },
    }],
    payment_source: { paypal: { experience_context: {
      brand_name: 'BotSetu', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
      return_url: returnUrl, cancel_url: cancelUrl,
    } } },
  }, { 'PayPal-Request-Id': `order-${referenceId}` });
  const link = (order.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  return { id: order.id, status: order.status, approveUrl: link && link.href };
}

async function captureOrder(orderId) {
  if (MOCK) {
    const o = mockOrders.get(orderId);
    if (!o) throw new Error('Unknown mock order ' + orderId);
    o.status = 'COMPLETED';
    return { id: orderId, status: 'COMPLETED', captureId: 'MOCKCAP-' + orderId.slice(5), mock: true };
  }
  const r = await api('POST', `/v2/checkout/orders/${orderId}/capture`, {}, { 'PayPal-Request-Id': `capture-${orderId}` });
  const cap = r.purchase_units?.[0]?.payments?.captures?.[0];
  return { id: r.id, status: r.status, captureId: cap && cap.id, payer: r.payer?.email_address };
}

async function getOrder(orderId) {
  if (MOCK) return mockOrders.get(orderId) || null;
  return api('GET', `/v2/checkout/orders/${orderId}`);
}

// Invoicing v2: draft -> send. Returns the payer-facing invoice link.
async function createAndSendInvoice({ referenceId, itemName, amount, currency, payerEmail, note }) {
  if (MOCK) {
    const id = 'INV2-MOCK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    return { id, status: 'SENT', payUrl: `https://www.sandbox.paypal.com/invoice/p/#${id}`, mock: true };
  }
  const draft = await api('POST', '/v2/invoicing/invoices', {
    detail: { currency_code: currency, reference: referenceId, note: note || 'Thank you!' },
    invoicer: process.env.PAYPAL_INVOICER_EMAIL ? { email_address: process.env.PAYPAL_INVOICER_EMAIL } : undefined,
    primary_recipients: payerEmail ? [{ billing_info: { email_address: payerEmail } }] : undefined,
    items: [{ name: itemName.slice(0, 200), quantity: '1', unit_amount: { currency_code: currency, value: money(amount) } }],
  });
  const id = draft.id || (draft.href || '').split('/').pop();
  await api('POST', `/v2/invoicing/invoices/${id}/send`, { send_to_recipient: !!payerEmail, send_to_invoicer: false });
  const inv = await api('GET', `/v2/invoicing/invoices/${id}`);
  return { id, status: inv.status, payUrl: inv.detail?.metadata?.recipient_view_url };
}

module.exports = { MOCK, ENV, createOrder, captureOrder, getOrder, createAndSendInvoice };
