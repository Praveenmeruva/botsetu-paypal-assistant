# BotSetu Assistant: chat, book and pay with PayPal in 15+ languages

An AI chat assistant for small Indian businesses such as clinics and coaching centres. A customer messages in Telugu, Hindi, Tamil, English or any of 15+ languages. The assistant shows real services and open slots, books one, and collects payment in the same chat through **PayPal**:

* **PayPal Orders v2**: creates the order, sends the customer to PayPal checkout, and captures the payment on return or on webhook.
* **PayPal Invoicing v2**: for "pay later", the assistant creates and sends a PayPal invoice and shares its link in chat.
* **AI agent with tool calling**: an OpenAI-compatible LLM (default **Sarvam `sarvam-105b`**, built for Indian languages) decides when to call `list_services`, `create_booking_and_payment`, `send_paypal_invoice` and `check_payment_status`. Prices and slots always come from tools, never from the model.
* **Sarvam Translate**: a fallback engine that works with no LLM, plus translation into 22 Indian languages.
* An owner dashboard (`/dashboard`) with live bookings, PayPal order IDs and capture IDs.
* A WhatsApp-style channel adapter (`POST /webhook/whatsapp`).

Zero npm dependencies. You need only Node 18+.

## Setup (about 5 minutes)

1. Create a free sandbox app at https://developer.paypal.com → *Apps & Credentials* → **Sandbox** → *Create App*. Copy the **Client ID** and **Secret**. Under *Sandbox accounts*, note the **personal** (buyer) account email and password for paying.
   * For the invoice path, enable **Invoicing** under the app's *Features*. Without it, PayPal returns 403 and the assistant falls back to sharing the PayPal checkout link.
2. Optionally, get a Sarvam API key at https://dashboard.sarvam.ai for the multilingual AI.
3. Configure and run:
   ```bash
   git clone https://github.com/Praveenmeruva/botsetu-paypal-assistant.git && cd botsetu-paypal-assistant
   cp .env.example .env   # fill PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, SARVAM_API_KEY
   npm start              # http://localhost:3000
   npm test               # offline end-to-end test
   ```
   * If the PayPal vars are empty, the app runs in **MOCK mode** (the badge shows "PayPal MOCK"), so the full flow works offline.
   * If there is no AI key, the deterministic rule engine runs. Telugu, Hindi and other languages still work when `SARVAM_API_KEY` is set.
4. Optional: use the PayPal webhook. Point a sandbox webhook for `CHECKOUT.ORDER.APPROVED` at `https://<host>/paypal/webhook`.
5. Optional: deploy to Render with the included `render.yaml` and set `PUBLIC_BASE_URL` to the Render URL.

## Architecture

```
Customer (web chat / WhatsApp adapter)
        │  text in any language
        ▼
 src/server.js ── /api/chat ──► src/agent.js ──► LLM (Sarvam sarvam-105b, tool calling)
        │                           │  (fallback: rule planner + Sarvam Translate)
        │                           ▼
        │                     src/tools.js  list_services | create_booking_and_payment
        │                           │        send_paypal_invoice | check_payment_status
        │                           ▼
        │                     src/paypal.js  OAuth2 → Orders v2 create / capture
        │                                     Invoicing v2 create + send
        ▼
 /paypal/return  ◄── buyer approves on PayPal ──►  capture → booking PAID
 /paypal/webhook (CHECKOUT.ORDER.APPROVED → capture)
 /api/outbox → "✅ Payment received" pushed back into the chat
 /dashboard  → owner sees bookings, order IDs, capture IDs
```

Safety: idempotent `PayPal-Request-Id` on create and capture, a slot-clash check, and server-side prices only. The model cannot change an amount.

## Walkthrough script (for judges)

1. Open http://localhost:3000. Pick **Sunrise Family Clinic**.
2. Type in Telugu: `నమస్కారం, నాకు జనరల్ డాక్టర్ అపాయింట్‌మెంట్ కావాలి`. The assistant lists services and prices from `list_services`.
3. Reply: `ఈరోజు 11:00 కి, నా పేరు రవి`. A booking is created along with a **PayPal order**, and a *Pay with PayPal* button appears.
4. Click it and log in with your sandbox **personal** account. Approve the payment. The app captures the order and shows the success page. The chat then receives "✅ Payment received via PayPal (capture …)".
5. Switch to **Vidya Coaching Centre** and type in Hindi: `मुझे ट्रायल क्लास चाहिए, शाम 5:30 बजे, मेरा नाम अनीता है`, then `मैं बाद में पैसे दूँगी, इनवॉइस भेज दो`. A **PayPal invoice** is created and sent, and its link appears in chat.
6. Open http://localhost:3000/dashboard to see both bookings, their statuses and the PayPal IDs.

## Notes
* **India accounts:** PayPal has not offered domestic payments in India since 1 April 2021. `CURRENCY=INR` returns `CURRENCY_NOT_SUPPORTED`, and an IN buyer paying an IN seller in USD sees "This seller doesn't accept payments in your currency". Keep `CURRENCY=USD` (the default) and pay with a **US personal** sandbox account (Testing Tools → Sandbox Accounts → Create, country United States). An IN business account can receive USD from that buyer.
* Sandbox prices are in USD (`CURRENCY`), because sandbox merchant accounts receive USD reliably. Production would use the merchant's currency.
* State is kept in memory. Swap `src/store.js` for a database in production.

## License
MIT
