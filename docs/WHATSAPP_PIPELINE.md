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

- Webhook emitter + signing secret (see issue).
- Template messages approved in Meta (first message to a customer must be a template).
- A `status` field per lead: new → contacted → engaged → ready_to_buy → paid → delivered → installed / lost.
