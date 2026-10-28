# Video plan (target 2:40, hard limit < 3:00)

No third-party music. Record at 1080p: screen capture of a browser at localhost:3000, with a phone-width window.

| # | Time | Shot | Narration |
|---|------|------|-----------|
| 1 | 0:00–0:15 | Title card "BotSetu Assistant: chat, book, pay with PayPal" over the chat UI | "A small clinic in Hyderabad gets hundreds of messages a day, in Telugu, Hindi and English. Booking them and collecting payment eats the whole day." |
| 2 | 0:15–0:30 | Architecture diagram from README | "BotSetu Assistant is an AI agent that books customers and takes payment through PayPal, inside the chat, in 15+ languages." |
| 3 | 0:30–0:55 | Pick Sunrise Family Clinic. Type the Telugu greeting. The ⚙ list_services line and the service list appear | "The customer writes in Telugu. The agent calls a tool for real prices and open slots, so it never invents a price." |
| 4 | 0:55–1:20 | Send the slot and name. The ⚙ create_booking_and_payment → PayPal order line and the Pay with PayPal button appear | "It books 11 o'clock and creates a PayPal order with the Orders API. The amount comes from the server, never from the model." |
| 5 | 1:20–1:50 | Click the button. PayPal sandbox login, approve, success page | "The customer pays on PayPal's own checkout. When they come back, we capture the order." |
| 6 | 1:50–2:05 | Back in the chat: "✅ Payment received via PayPal (capture …)" | "The confirmation lands straight back in the chat." |
| 7 | 2:05–2:25 | Switch to Vidya Coaching. Hindi trial-class request, then "invoice bhej do". Invoice link appears | "A parent wants to pay later, so the agent sends a PayPal invoice instead, using the Invoicing API." |
| 8 | 2:25–2:40 | /dashboard with PAID and PENDING rows and PayPal IDs. End card with repo URL | "The owner sees every booking and payment in one place. It's open source, MIT licensed, and runs locally in five minutes." |

Checklist: show the badge reading "PayPal sandbox" (not MOCK) while recording, upload to YouTube as Public, and paste the link into Devpost.
