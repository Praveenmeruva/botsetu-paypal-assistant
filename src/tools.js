// Agent tools. Every money-moving step goes through PayPal (Orders v2 / Invoicing v2).
const catalog = require('./catalog');
const paypal = require('./paypal');
const store = require('./store');

const CURRENCY = () => process.env.CURRENCY || 'USD';
const BASE_URL = () => process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const definitions = [
  { type: 'function', function: { name: 'list_services', description: 'List services, prices and open time slots for the current business.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'create_booking_and_payment', description: 'Book a service at a slot for a customer and create a PayPal order. Returns a PayPal checkout link to share in chat.', parameters: { type: 'object', properties: {
    service_id: { type: 'string' }, slot: { type: 'string', description: 'HH:MM from list_services' }, date: { type: 'string', description: 'YYYY-MM-DD, default today' }, customer_name: { type: 'string' },
  }, required: ['service_id', 'slot', 'customer_name'] } } },
  { type: 'function', function: { name: 'send_paypal_invoice', description: 'Send a PayPal invoice for an existing booking instead of a checkout link (useful for pay-later).', parameters: { type: 'object', properties: { booking_id: { type: 'string' }, payer_email: { type: 'string' } }, required: ['booking_id'] } } },
  { type: 'function', function: { name: 'check_payment_status', description: 'Check whether a booking has been paid.', parameters: { type: 'object', properties: { booking_id: { type: 'string' } }, required: ['booking_id'] } } },
];

async function run(name, args, ctx) {
  const biz = catalog[ctx.business];
  if (name === 'list_services') {
    const taken = [...store.bookings.values()].filter((b) => b.business === ctx.business && b.status !== 'CANCELLED').map((b) => `${b.date} ${b.slot}`);
    const td = today();
    return { business: biz.name, currency: CURRENCY(), services: biz.services, open_slots_today: biz.slots.filter((s) => !taken.includes(`${td} ${s}`)) };
  }
  if (name === 'create_booking_and_payment') {
    const svc = biz.services.find((s) => s.id === args.service_id || s.name.toLowerCase() === String(args.service_id).toLowerCase());
    if (!svc) return { error: 'Unknown service_id', valid: biz.services.map((s) => s.id) };
    if (!biz.slots.includes(args.slot)) return { error: 'Slot not available', valid: biz.slots };
    const date = args.date || today();
    const clash = [...store.bookings.values()].find((b) => b.business === ctx.business && b.date === date && b.slot === args.slot && b.status !== 'CANCELLED');
    if (clash && clash.session === ctx.sessionId && clash.serviceId === svc.id) // idempotent repeat call
      return { booking_id: clash.id, service: clash.service, date, slot: clash.slot, amount: `${clash.amount} ${clash.currency}`, paypal_order_id: clash.orderId, pay_link: clash.payLink, status: clash.status };
    if (clash) return { error: 'Slot already booked', valid: biz.slots };
    const b = store.newBooking({ business: ctx.business, service: svc.name, serviceId: svc.id, amount: svc.price, currency: CURRENCY(), slot: args.slot, date, customer: args.customer_name, session: ctx.sessionId });
    const order = await paypal.createOrder({
      referenceId: b.id, description: `${biz.name}: ${svc.name} on ${date} ${args.slot}`, amount: svc.price, currency: CURRENCY(),
      returnUrl: `${BASE_URL()}/paypal/return?booking=${b.id}`, cancelUrl: `${BASE_URL()}/paypal/cancel?booking=${b.id}`,
    });
    b.orderId = order.id; b.payLink = order.approveUrl; store.byOrder.set(order.id, b.id);
    return { booking_id: b.id, service: svc.name, date, slot: args.slot, amount: `${svc.price} ${CURRENCY()}`, paypal_order_id: order.id, pay_link: order.approveUrl };
  }
  if (name === 'send_paypal_invoice') {
    const b = store.bookings.get(args.booking_id);
    if (!b) return { error: 'Unknown booking' };
    try {
      const inv = await paypal.createAndSendInvoice({ referenceId: b.id, itemName: `${b.service} (${b.date} ${b.slot})`, amount: b.amount, currency: b.currency, payerEmail: args.payer_email });
      b.invoiceId = inv.id;
      return { booking_id: b.id, invoice_id: inv.id, status: inv.status, invoice_link: inv.payUrl };
    } catch (e) {
      // e.g. 403 when the PayPal app lacks the Invoicing feature: fall back to the existing PayPal checkout link.
      console.warn('Invoicing unavailable:', e.message.slice(0, 200));
      return { booking_id: b.id, invoice_id: null, status: 'INVOICE_UNAVAILABLE', invoice_link: b.payLink, note: 'PayPal invoice could not be created; share this PayPal checkout link to pay later instead.' };
    }
  }
  if (name === 'check_payment_status') {
    const b = store.bookings.get(args.booking_id);
    if (!b) return { error: 'Unknown booking' };
    return { booking_id: b.id, status: b.status, capture_id: b.captureId || null };
  }
  return { error: 'Unknown tool ' + name };
}
module.exports = { definitions, run };
