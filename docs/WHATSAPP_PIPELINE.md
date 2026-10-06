# WhatsApp follow-up pipeline

Goal: every request gets a WhatsApp reply within a minute, and is walked to a confirmed "yes, I'm buying" without a human. People only step in to deliver and install.

Tool: n8n (self-hosted or cloud) + WhatsApp Cloud API (Meta). The website fires a webhook; n8n runs the conversation; status is written back to our API.

## 1. Triggers (website → n8n webhook)

| Event | Fired when | Key data |
|---|---|---|
| `lead.created` | Someone leaves a phone at checkout, finder or helper (`leads` table) | name, phone, items, total, source |
| `order.pending_transfer` | Bank transfer chosen, not yet paid | order id, amount, account details |
| `order.paid` | Payment confirmed | order id, recipient, LGA, installer yes/no |
| `install.requested` | Order or Go Solar Me page asks for an installer | order/pool id, LGA, address |
| `finance.requested` | Pay small small form sent (`finance_requests`) | down %, months, income band |
| `pool.created` / `pool.funded` / `pool.ended` | Go Solar Me milestones | pool id, raised, goal, deadline |
| `brand.requested` | "Feature your brand" form | brand, contact, product types |

All webhooks are signed (HMAC header `x-sb-signature`) with a shared secret set in Vercel and n8n. Never put customer data in URLs.

## 2. Flows

**A. Buy (kit only)** — `lead.created`, no order after 30 min
1. "Hi {name}, it's Solar Builders. You were looking at {kit} ({total}). Want me to hold today's price?" Buttons: *Yes, hold it* / *I have a question* / *Not now*.
2. Yes → send the resume link (`/checkout?resume=…`). Question → AI answer from the product FAQ; hand to a human if unsure. Not now → one reminder in 3 days, then stop.
3. `order.paid` → "Confirmed. We'll call {recipient} to deliver in {LGA} within 48h." Then delivery updates from the team panel.

**B. Buy + installer** — `install.requested`
1. Ask: building type, roof (zinc/concrete/none), distance from panels to inverter, preferred day. Buttons where possible.
2. Send installer quote range from the package data; ask to confirm.
3. Confirm → book slot, notify installer group, send date to customer. Day before: reminder. After: "All working?" + photo request for the share card.

**C. Pay small small (loan)** — `finance.requested`
1. "Thanks {name}. To check {months}-month plans we need: a valid ID, 3 months of bank statements, your work/business." Collect as WhatsApp uploads.
2. Forward the bundle to the lending partner (email/API). Status updates: received → reviewing → approved/declined.
3. Approved → down-payment link. Declined → offer a smaller kit or Go Solar Me.

**D. Pay by transfer** — `order.pending_transfer`: send account details, remind at 6h and 24h, cancel at 72h with a kind message.

**E. Go Solar Me** — `pool.created`: send the share kit (link + status image) and a tip. At 25/50/75%: a new status image to post. `pool.ended`: options (extend once, smaller kit, refund).

## 3. Rules

- One message thread per phone; never more than 2 unanswered messages in a row.
- Every message has a "talk to a person" option; that tags the chat for the team.
- Only message people who gave a phone and consent (`leads.consent`). "STOP" ends it.
- Write each step back via `POST /api/v1/team/leads/{id}` (status, notes) so the team panel shows where everyone is.

## 4. What we build on our side

Built:
- Signed webhook emitter (`src/lib/server/webhooks.ts`). Set `WEBHOOK_URL` (the n8n webhook) and `WEBHOOK_SECRET` in Vercel. Events sent: `lead.created`, `brand.requested`, `order.paid` (carries `installer` and `pool_id`, so it also covers "install requested" and "pool funded"), `finance.requested`, `pool.created`.
- Not sent yet: `order.pending_transfer` (needs a hook in the Paystack pending state) and `pool.ended` (pools end lazily when read; a daily cron could emit it).
- Lead status: new, contacted, engaged, ready_to_buy, paid, lost. Plus `needs_human` for "talk to a person"; the morning summary lists those first.
- Write-back, signed with `WEBHOOK_SECRET` (header `x-sb-signature` = hex HMAC-SHA256 of the raw body):
  - `PATCH /api/v1/team/leads/{id}` body `{ "status": "engaged", "note": "...", "needs_human": true, "stop": true }` (all optional).
  - `POST /api/v1/automation/stop` body `{ "phone": "0801..." }` ends every open lead for that number and withdraws consent.

You still do (Meta side): WhatsApp Cloud API number, and templates approved (first message to a customer must be a template).

## 5. n8n build sheet (flows A, D, E and STOP)

Every flow starts with a **Webhook** node (POST, one URL for all events) and a **Switch** on `event`. Verify the signature in a Code node: HMAC-SHA256 of the raw body with `WEBHOOK_SECRET` must equal `x-sb-signature`.

Shared nodes:
- **Send template**: HTTP Request, POST `https://graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages`, bearer = WhatsApp token (store it as an n8n credential, never in the flow). Body `{"messaging_product":"whatsapp","to":"{phone}","type":"template","template":{"name":"...","language":{"code":"en"},"components":[...]}}`.
- **Write back**: HTTP Request, PATCH `https://solar.nexprove.com/api/v1/team/leads/{id}`, body `{"status":"contacted"}`, header `x-sb-signature` computed in a Code node (`crypto.createHmac('sha256', secret).update(body).digest('hex')`).

Flow A (`lead.created`): Wait 30 min → check the lead is still open (the `order.paid` event for the same phone cancels it; keep a small n8n Data Table keyed by phone) → Send template `kit_hold_offer` → write back `contacted`. Inbound button "Yes, hold it" → send the resume link → `ready_to_buy`. "Question" → `engaged` + `needs_human: true`. "Not now" → Wait 3 days, one reminder, stop.

Flow D (`order.pending_transfer`, once emitted): send account details template; Wait 6h and 24h with a paid-check; at 72h send the cancel message.

Flow E (`pool.created`): send template `pool_share_kit` with the link. Milestones come from `order.paid` with `pool_id`.

Inbound (WhatsApp webhook into n8n, separate from the one the ops agent uses):
- Text "STOP" (case-insensitive) → POST `/api/v1/automation/stop` with the sender's number → reply "You're unsubscribed."
- Button "Talk to a person" or text "agent/human" → PATCH the lead with `needs_human: true`.

Template names to submit to Meta: `kit_hold_offer`, `transfer_details`, `pool_share_kit`, `order_confirmed`. Utility category, plain text with {{1}}.. variables.
