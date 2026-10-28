# Devpost submission text

**Title:** BotSetu Assistant: chat, book and pay with PayPal in 15+ languages

**Tagline:** Small Indian businesses get an AI assistant that books customers and collects payment through PayPal, in the customer's own language.

## Inspiration
Millions of small clinics, coaching centres and shops in India run on chat messages and phone calls. Staff answer the same questions all day, double-book slots and chase payments. Many customers prefer Telugu, Hindi or Tamil over English. We wanted one assistant that understands them, books the slot and gets the business paid before the visit.

## What it does
* The customer chats in any of 15+ languages. Language is detected automatically.
* The AI agent reads the business's real services, prices and open slots through tools, so it never makes them up.
* It books the slot and creates a **PayPal order (Orders v2)**. A *Pay with PayPal* button appears in chat.
* After approval, the order is **captured** on return or by webhook, and a confirmation is pushed back into the chat.
* "Pay later?" The agent creates and sends a **PayPal invoice (Invoicing v2)** and shares the link in chat.
* The owner dashboard shows every booking with its PayPal order and capture IDs.

## How we built it
* Node.js with zero dependencies. The PayPal REST client covers OAuth2, Orders create, get and capture, and Invoicing create and send, with idempotent `PayPal-Request-Id` headers.
* The AI agent uses the OpenAI-compatible tool-calling loop. It runs on Sarvam `sarvam-105b`, a model built for Indian languages, and any compatible model can be swapped in. There are four tools: `list_services`, `create_booking_and_payment`, `send_paypal_invoice` and `check_payment_status`.
* A fallback rule planner uses Sarvam Translate, so the flow keeps working if the LLM is down.
* A web chat UI styled like a messaging app, a WhatsApp channel adapter endpoint, and a `render.yaml` for one-click Render deploys.

## Challenges
* Stopping the model from changing money. Amounts live only on the server, and the model passes IDs, never prices.
* Parallel tool calls created duplicate bookings, so we made booking creation idempotent per session and slot.
* Keeping links, IDs and amounts intact while replying in Indic scripts.

## Accomplishments
A complete loop from a Telugu or Hindi chat message to a captured PayPal sandbox payment, plus an invoice path. It runs locally in under 5 minutes.

## What we learned
PayPal Orders v2 combined with agent tool calling is a clean fit. The agent handles the conversation, while PayPal handles trust and settlement.

## What's next
Production WhatsApp Business API delivery, refunds through the Payments API, subscriptions for monthly coaching fees, and Venmo or Pay Later options for international customers.

## Built with
node.js, paypal-orders-api, paypal-invoicing-api, sarvam-ai, render, javascript, html

## Significant update note
This assistant was newly built during the Submission Period (Oct–Nov 2026).

## Try it
Repo: https://github.com/Praveenmeruva/botsetu-paypal-assistant. Follow the README Setup. It needs PayPal sandbox app credentials and runs offline in MOCK mode without them.

## Submission form fields
* **Project name:** BotSetu × PayPal: multilingual chat booking with PayPal Checkout and Invoicing
* **Tagline:** Book and pay in Telugu, Hindi, Tamil or English, inside the chat, with PayPal.
* **Video (under 3 min):** `<YOUTUBE_URL>` (file: video/botsetu-paypal.mp4, 2:32, 1080p, English voiceover with subtitles)
* **Repository:** https://github.com/Praveenmeruva/botsetu-paypal-assistant (MIT)
* **Testing instructions:** `cp .env.example .env`, add PayPal sandbox client ID/secret (or leave empty for MOCK mode), `node src/server.js`, open http://localhost:3000, then pay with any PayPal sandbox personal (US) account. Owner dashboard: /dashboard.html. Tests: `npm test`.
* **PayPal APIs used:** Orders v2 (create, capture), Invoicing v2 (create, send), OAuth2 client credentials.
* **Built with:** node.js, paypal-orders-api, paypal-invoicing-api, sarvam-ai, javascript, html
