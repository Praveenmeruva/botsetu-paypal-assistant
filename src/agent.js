// Conversational agent: LLM with tool calling (OpenAI-compatible API, e.g. Sarvam sarvam-105b),
// with a deterministic fallback planner so the flow works even without an LLM key.
const tools = require('./tools');
const catalog = require('./catalog');
const { detectLang, translate } = require('./lang');

const llmKey = () => process.env.LLM_API_KEY || process.env.SARVAM_API_KEY || '';
const LLM_BASE = () => process.env.LLM_BASE_URL || 'https://api.sarvam.ai/v1';
const LLM_MODEL = () => process.env.LLM_MODEL || 'sarvam-105b';

function systemPrompt(biz, lang) {
  return `You are the WhatsApp/web assistant for "${biz.name}" (a ${biz.kind}), built by BotSetu.
Help customers book a service and pay securely via PayPal. Always call list_services before quoting prices or slots; never invent them.
When the customer has chosen a service, a slot and given their name, call create_booking_and_payment and share the pay_link exactly as returned.
If they prefer to pay later, offer send_paypal_invoice. Be brief and warm (max 4 short lines).
Reply in the customer's language (detected: ${lang}); keep links, IDs and amounts unchanged.`;
}

async function callLLM(messages) {
  const res = await fetch(`${LLM_BASE()}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${llmKey()}`, 'api-subscription-key': llmKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LLM_MODEL(), messages, tools: tools.definitions, tool_choice: 'auto', temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).choices[0].message;
}

const stripThink = (s) => (s || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

async function llmTurn(session, text, ctx) {
  const biz = catalog[session.business];
  session.history.push({ role: 'user', content: text });
  const msgs = [{ role: 'system', content: systemPrompt(biz, session.lang) }, ...session.history];
  const events = [];
  for (let i = 0; i < 5; i++) {
    const m = await callLLM(msgs);
    if (!m.tool_calls || !m.tool_calls.length) {
      const reply = stripThink(m.content);
      session.history.push({ role: 'assistant', content: reply });
      return { reply, events, engine: 'llm' };
    }
    msgs.push({ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls });
    for (const tc of m.tool_calls) {
      let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
      const result = await tools.run(tc.function.name, args, ctx);
      events.push({ tool: tc.function.name, args, result });
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }
  throw new Error('LLM tool loop limit');
}

// Fallback planner: understands numbers/keywords in English, translates replies with Sarvam.
async function ruleTurn(session, text, ctx) {
  const biz = catalog[session.business];
  const en = session.lang === 'en-IN' ? text : await translate(text, 'en-IN', session.lang);
  const t = en.toLowerCase();
  const events = [];
  const st = (session.rule ||= {});
  let reply;
  const svcIdx = t.match(/\b(?:service\s*)?([1-9])\b/);
  const slot = biz.slots.find((s) => t.includes(s) || t.includes(s.replace(/^0/, '')));
  const name = en.match(/(?:name is|i am|i'm|naa peru|name:)\s*([A-Za-z][A-Za-z ]{1,30})/i);
  if (/invoice|pay later/.test(t) && st.bookingId) {
    const r = await tools.run('send_paypal_invoice', { booking_id: st.bookingId }, ctx); events.push({ tool: 'send_paypal_invoice', result: r });
    reply = `PayPal invoice ${r.invoice_id} created. Pay here: ${r.invoice_link}`;
  } else {
    if (!st.service && svcIdx && biz.services[svcIdx[1] - 1]) st.service = biz.services[svcIdx[1] - 1].id;
    if (slot) st.slot = slot;
    if (name) st.name = name[1].trim();
    if (!st.service) {
      const r = await tools.run('list_services', {}, ctx); events.push({ tool: 'list_services', result: r });
      reply = `Welcome to ${biz.name}! Choose a service by number:\n` + r.services.map((s, i) => `${i + 1}. ${s.name} – ${s.price} ${r.currency}`).join('\n');
    } else if (!st.slot) {
      const r = await tools.run('list_services', {}, ctx); events.push({ tool: 'list_services', result: r });
      reply = `Great. Open times today: ${r.open_slots_today.join(', ')}. Which time works?`;
    } else if (!st.name) {
      reply = 'Please tell me your name (e.g. "My name is Ravi").';
    } else {
      const r = await tools.run('create_booking_and_payment', { service_id: st.service, slot: st.slot, customer_name: st.name }, ctx);
      events.push({ tool: 'create_booking_and_payment', result: r });
      if (r.error) { reply = `${r.error}. Options: ${r.valid.join(', ')}`; delete st.slot; }
      else { st.bookingId = r.booking_id; reply = `Booked ${r.service} at ${r.slot} for ${st.name} (ID ${r.booking_id}). Amount ${r.amount}.\nPay securely with PayPal: ${r.pay_link}\nSay "pay later" to get a PayPal invoice instead.`; }
    }
  }
  return { reply: await translate(reply, session.lang), events, engine: 'rules' };
}

async function handle(session, text, ctx) {
  session.lang = detectLang(text) !== 'en-IN' ? detectLang(text) : session.lang || 'en-IN';
  if (llmKey() && process.env.AGENT_ENGINE !== 'rules') {
    try { return await llmTurn(session, text, ctx); }
    catch (e) { console.warn('LLM failed, using rules:', e.message); session.history.pop(); }
  }
  return ruleTurn(session, text, ctx);
}
module.exports = { handle };
