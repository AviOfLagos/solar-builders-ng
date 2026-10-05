# Solar Builders NG API (v1)

The same backend serves the website and the mobile app. Everything the app needs is here.

- **Base URL:** `https://solar-ng.vercel.app/api/v1`. It moves to `https://solar.nexprove.com/api/v1` once that domain is live. Keep it in app config.
- **Code:** repo `AviOfLagos/solar-builders-ng`. The routes are in `src/app/api/v1/**/route.ts` and the logic is in `src/lib/server/*`. Shared constants are in `src/config/store.ts`, and use the same limits and words as the web.
- **Format:** JSON in, JSON out. Money is whole naira as integers (₦643,370 is `643370`). Dates are ISO strings.
- **Phones:** send Nigerian numbers any way people type them (`0803 123 4567`, `+234803…`). The server stores `+234…`.

## Auth

Send `Authorization: Bearer <token>` on every call. The website uses an httpOnly cookie, but the app uses the token.

| Call | Body | Returns |
|---|---|---|
| `POST /auth/register` | `{ name, email, password (8–128), phone? }` | `{ user: {id,email,name}, token }`. `409` with `code: "account_exists"`: offer sign-in. |
| `POST /auth/login` | `{ email, password }` | `{ user, token }`. `401` with `code: "no_account"` when no account uses that email: offer sign-up. |
| `POST /auth/google` | `{ credential }` (Google ID token from the native SDK) | `{ user, token, created }` |
| `POST /auth/apple` | `{ identityToken, fullName? }` (from `expo-apple-authentication`; Apple sends the name only the first time) | `{ user, token, created }` |
| `POST /auth/reset` | `{ email }` | `{ ok }`. Emails a 6-digit code valid 15 minutes. Same answer whether or not the account exists. |
| `POST /auth/reset/confirm` | `{ email, code, password }` | `{ user, token }`: password set and signed in |
| `POST /auth/logout` | – | `{ ok }` (the app just deletes its token; also call `DELETE /me/devices/{token}`) |

- Tokens last 60 days. A `401` from any call means sign in again.
- **Google on the app:** create iOS and Android OAuth client IDs in the Google Cloud project `solar-builders-ng` (admin@nexprove.com). Add them, comma-separated, to the Vercel env var `GOOGLE_CLIENT_IDS`. The server accepts tokens whose audience is any of those IDs or the web ID.
- **Errors for Google:** `409` means the email is already linked to a different Google account. The `email_verified` claim must be true.
- **Apple:** tokens must have the app's bundle ID as audience. Allowed IDs come from the `APPLE_CLIENT_IDS` env var (default `ng.solarbuilders.gosolarme`).

## Errors

Errors look like `{ error: "Human sentence to show", fields?: { fieldName: "short hint" }, code?: "…" }`.

| Status | Meaning |
|---|---|
| `400` | Fix the input. Show `error`, and put `fields` hints under the matching inputs. |
| `401` / `404` | Not signed in / not found (also used for "not yours"). |
| `402` | A saved card was declined. Offer another card or a transfer. |
| `409` | State changed. `code: "amount_changed"` (comes with the new `amount`, so show it and ask again), `"gift_changed"` (apply the gift code again), or for a pool, "already funded" or "closed". |
| `429` | Rate limited. Wait and retry. |
| `502` | Paystack couldn't open a payment page. Retry. |
| `503` | Payments are not switched on. Show WhatsApp ordering instead. |

## Catalog and content

- **`GET /catalog`:** everything needed to render the store in one cacheable call. It returns:
  - `store {name, whatsapp, phone, deliveryFee, currency, lgas[]}`
  - `promo`, `categories`, `brands`
  - `products[]`: id, slug, name, brand, category, price, image (absolute URL), specs
  - `segments[]`: buyer types, each with `tiers[]` (packages), and each tier lists `items: [{id, qty}]` ready to add to the cart.
- Prices are already final. The server re-prices every cart, so never send prices.
- **`GET /builds/{id}`:** a saved, shareable cart. **`POST /builds`** with `{ items, title?, note? }` returns `{ id, path, store, total }`.
- **`GET /stores/{slug}`:** a seller's public store.
- **`POST /subscribe`** with `{ email, source: "app" }` signs up for Solar Friday emails.

A **cart** everywhere is `items: [{ id, qty }]`, using product ids from the catalog. The limits are in `CART` in `src/config/store.ts`: up to 40 lines, 50 of each item, and ₦100m total.

## Account

- **`GET /me`:** returns the following. `cards` holds saved cards, newest naira cards first; `provider` says which way to charge them, and the card's `id` goes in `savedCardId` at checkout. `pay` is the same as `GET /payments`.
  ```
  { user: {id,email,name,phone,google,hasPassword} | null,
    cards: [{ id: "pc_…"|"pm_…", provider: "paystack"|"stripe", brand, last4, expMonth, expYear, nickname, bank? }],
    store: {slug,name,kind,commission_bps} | null,
    team: boolean,
    lastDelivery: {address,lga,landmark,altPhone} | null,
    pay: { naira, intl, minCharge, stripePublishableKey } }
  ```
  Use `lastDelivery` to pre-fill checkout.
- **`PATCH /me`:** `{ name?, phone? }` returns `{ user }`. The email can't change.
- **`DELETE /me`:** `{ confirm: "DELETE" }` deletes the account. Personal details, saved cards and push devices go. Open Go Solar Me pages close and refund every supporter. Orders stay, without a name, for records. The token stops working.
- **`POST /me/devices`:** `{ token: "ExponentPushToken[…]", platform: "ios"|"android" }`. Call after every sign-in. `DELETE /me/devices/{token}` on sign-out.
- **`GET /me/orders`:** `{ orders: [{id, items, subtotal, total_paid, gift_card_used, status, statusLabel, status_at, recipient, delivery:{lga,address}, installer, pool_id, created_at}], pools: [...] }`
- **`GET /me/builds`:** the lists this person shared: `{ builds: [{ id, title, path, items (count), total, views, created_at }] }`, newest first, priced today.
- **`GET /me/store`:** the seller dashboard: `{ store, stats:{orders,sales,earned}, recent[], builds[] }`. **`POST /stores`** with `{ name, slug, bio?, kind: "affiliate"|"installer", whatsapp? }` creates or updates the store.
- **Cards:**
  - `PATCH /cards/{id}` with `{ nickname }` renames a card.
  - `DELETE /cards/{id}` removes it.
  - To add a card, see "Add a card" below.

Order `status` values, with the customer words in `ORDER_STATUS`: `awaiting_payment`, `pending`, `confirmed`, `out_for_delivery`, `delivered`, `installed`, `cancelled`, `refunded`, `expired`. Only show orders that are not `awaiting_payment` or `expired`; `/me/orders` already filters them.

## Low-typing helpers

- **`POST /leads`** with `{ id?, name?, phone?, email?, consent: true, source: "app", items }` returns `{ id }`.
  - Call it as soon as you have a phone or email, and again with the same `id` as the cart changes.
  - Send the `id` as `leadId` at checkout so the follow-up stops.
- **`GET /leads/{id}`** returns `{ items }`. This is the resume-cart link (`/cart?resume=ID`).
- **`GET /gift-cards/{code}`** returns `{ code, balance }`, or `404`.

## Payments

**`GET /payments`** returns `{ naira, intl, minCharge, stripePublishableKey }`.

| Option | Provider | Methods | Default |
|---|---|---|---|
| `naira` | Paystack | card, bank transfer, USSD | Yes, when on |
| `intl` | Stripe | cards from abroad | No |

- Only show the choice when both are on.
- Send `provider: "paystack" | "stripe"` on checkout, chip-ins and gift cards. If you leave it out, the server picks naira.

### Paystack flow (naira)

1. **Start:** the start call returns `{ provider: "paystack", id: "ps_…", authorizationUrl }`.
2. **Pay:** open `authorizationUrl` in an in-app browser (SFSafariViewController or Chrome Custom Tabs, or a WebView).
3. **Detect the end:** the buyer finishes or cancels, and Paystack sends them to one of these:
   - `…/checkout/success?reference=ps_…` (orders and gift cards, and orders that were cancelled)
   - `…/fund/{id}` (chip-ins that were cancelled)
   - `…/gift-cards` (gift cards that were cancelled)

   Close the browser when you see any of these, or when the user closes it.
4. **Confirm:** call `POST /payments/{id}` with `{}`. It verifies with Paystack, completes the order, and returns the summary (below).
   - `paymentStatus: "processing"` or `"pending"` means a bank transfer is still settling. Poll every 5s for about a minute, then say "we'll confirm by email". The webhook completes it either way.
5. **Release a hold:** if the order was cancelled or failed, call `POST /payments/{id}/cancel` with `{}` to release any gift card hold at once. Otherwise it expires after 60 minutes.

### Stripe flow (cards from abroad)

1. **Start:** the start call returns `{ provider: "stripe", id: "pi_…", clientSecret }`.
2. **Pay:** present the Stripe PaymentSheet (`@stripe/stripe-react-native`) with `clientSecret` and `stripePublishableKey`.
3. **Confirm:** call `POST /payments/{id}` with `{ clientSecret }`.
4. **Release a hold:** on failure, call `POST /payments/{id}/cancel` with `{ clientSecret }`.

### Payment summary

`POST /payments/{id}` (use it for both providers) returns:

```
{ provider, paymentStatus: "succeeded"|"processing"|"pending"|"failed"|"canceled", amount, kind: "order"|"contribution"|"gift_card"|"card_setup", ok, emailed, error?,
  order?: { ref, total, giftUsed, phone, email, installer, recipient, status },        // kind order
  pool?: { id, title, goal, raised, status }, accepted?, refunded?,                     // kind contribution
  gift?: { code, amount, toName } }                                                      // kind gift_card
```

`ok: false` together with `succeeded` means the order had already expired, so the money was refunded. Show `error`.

### Checkout

**`POST /checkout`** takes this body:

```
{ items, name, email, phone, address, lga, landmark?, altPhone?, notes?, installer?: bool,
  forSomeoneElse?: bool, recipientName?, recipientPhone?, giftMessage?,
  giftCode?, leadId?, ref? (seller slug), expectedTotal (what you showed), source: "app",
  provider?, savedCardId?, saveCard?: bool, cardNickname? }
```

- **Delivery:**
  - Lagos only: `lga` must be one of `store.lgas`.
  - When the order is for someone else, `phone` may be international or empty. `recipientPhone` must be Nigerian.
- **Gift card:**
  - The server splits the total between the gift card and the payment, keeping any card part at ₦1,000 or more.
  - Compute the same split to show `expectedTotal`: see `split()` in `src/app/checkout/page.tsx`.
- **What comes back:**

  | Case | Response | Next step |
  |---|---|---|
  | Gift card covers it all | `{ ref, paid: true, amount: 0 }` | Done |
  | Paystack | `{ provider, ref, id, authorizationUrl, paymentStatus, amount }` | Open `authorizationUrl` |
  | Paystack, saved card | `{ …, paymentStatus: "succeeded" }` | No page. Call `POST /payments/{id}` |
  | Paystack, saved card, bank wants approval | `{ …, authorizationUrl }` | Open `authorizationUrl` |
  | Stripe | `{ provider, ref, id, clientSecret, paymentStatus, amount }` | Present the PaymentSheet |

- **Saving cards:** saved cards need a signed-in user. `saveCard` saves the card on success, for card payments only (not transfer or USSD).

### Add a card (account screen)

1. **Start:** `POST /cards/setup` with `{ nickname, provider }`.
   - `paystack`: returns `{ authorizationUrl, id }`. Paystack checks the card with ₦100, which we refund. It returns to `…/account/cards?reference=…`.
   - `stripe`: returns `{ clientSecret }` for a SetupIntent.
2. **Finish:** `PUT /cards/setup` with `{ reference }` (Paystack) or `{ setupIntentId }` (Stripe).

## Go Solar Me (group funding)

- **`POST /pools`** (signed in) takes the body below and returns `{ id, path, goal }`:
  ```
  { items, kind: "public"|"squad", forName?, occasion? (OCCASIONS slug), title?, story?,
    recipientName?, recipientPhone, altPhone?, address? (can wait), lga, landmark?, notes?, installer?,
    deadlineDays: 14|30|60, shares?: [{name}] (squad: 2–10 people), ref? }
  ```
- **`GET /pools/{id}`:** the public page data. Addresses and phones are never included.
  ```
  { id, kind, title, story, occasion, owner, lga, goal, raised, status: "open"|"ended"|"funded"|"cancelled",
    deadline, extended, choiceEnds, items[{id,name,price,qty,funded}], shares[{id,name,amount,paid}],
    supporters[{name,message,amount,at,piece}], order, isOwner, needsAddress }
  ```
- **`GET /pools`:** recent open public pages.
- **`POST /pools/{id}/contribute`:** no sign-in needed. It returns a Paystack or Stripe start, as for checkout. Send exactly one of `amount`, `piece` (fund one part) or `shareId` (squad).
  ```
  { email, name?, message?, anonymous?, amount? | piece? | shareId?, provider? }
  ```
- **Overshoot is safe:** if two people pay the last part at once, the second is refunded in full automatically. Any amount over the goal is refunded. A gap under ₦1,000 is covered by the store.
- **`POST /pools/{id}/close`** (owner) takes `{ action: "extend" }` (once, +30 days), `{ action: "smaller", items }` (switch to a kit the money covers; the leftover becomes a gift card) or `{ action: "cancel" }` (refunds everyone).
- **`POST /pools/{id}/address`** (owner) takes `{ address, landmark?, notes? }`.
- **Lifecycle:** `open` → `ended` (deadline passed; the owner has 7 days to choose) → `funded` (an order is placed) or `cancelled` (refunded). With no choice after 7 days, the pool refunds automatically.

## Gift cards and pay small small

- **Gift cards:** `POST /gift-cards` with `{ amount (₦10k–₦5m), fromName, fromEmail, toName?, toEmail?, message?, provider? }` returns a payment start. The code comes in the payment summary (`gift.code`) and by email.
- **Pay small small:** `POST /finance` with `{ items (₦300k+), name, phone, email?, employment, incomeBand, downPct, months }` returns `{ id }`. It is a request to a partner lender, and nothing is charged.

## Share pictures

These are PNGs for WhatsApp Status and Instagram:

- `GET /share/pool/{id}?f=story` (1080×1920), or `?f=square` (1080×1080)
- `GET /share/order/{ref}?f=story|square`

Download the image and pass it to the native share sheet along with the page link.

## Team (staff only)

These calls need a Google sign-in with an email listed in `TEAM_EMAILS`.

- `GET /team/overview`
- `PATCH /team/orders/{ref}` with `{ status }`
- `POST /team/orders/{ref}` with `{ reason }`: full refund
- `PATCH /team/leads/{id}`: mark the lead contacted

## Server-only endpoints

The app never calls these:

- `/api/paystack/webhook`
- `/api/stripe/webhook`
- `/api/cron/daily`: sweeps unpaid orders and pools and cleans up.

## Test mode

- **Paystack test card:** `4084 0840 8408 4081`, CVV `408`, any future expiry. If asked, PIN `0000` and OTP `123456`.
- **Stripe test card:** `4242 4242 4242 4242`. Use `4000 0000 0000 9995` for a decline.
- Both providers are in test mode until the business goes live. Switching means changing keys in Vercel only.

## Design tokens

| Token | Value |
|---|---|
| ink | `#10213B` |
| ink-2 | `#3A4B63` |
| mute | `#5B6B80` |
| haze (background) | `#E9EEF2` |
| paper | `#FFFFFF` |
| line | `#D5DEE6` |
| sun (primary button) | `#FFC21A` |
| sun-deep | `#E89B00` |
| leaf (success) | `#0E8A5F` |
| flare (error) | `#E5482D` |

- **Fonts:** Bricolage Grotesque (display) and Instrument Sans (body). WOFF files are in `assets/fonts` and `node_modules/@fontsource-variable/*`.
- **Radius:** 10px on inputs and 12–16px on cards.

## Push notifications

The server sends these to every registered phone of the right person (Expo push service). `data` tells the app what to open:

| When | To | `data` |
|---|---|---|
| Order paid; confirmed, out for delivery, delivered, installed | Buyer | `{ kind: "order", ref }` |
| Chip-in (title shows "25/50/75% funded" when a milestone is crossed) | Pool owner | `{ kind: "pool", id }` |
| Pool funded | Owner and signed-in supporters | `{ kind: "pool", id }` |
| 3 days left; deadline reached | Pool owner | `{ kind: "pool", id }` |
| Sale through a seller's link | Seller | `{ kind: "store" }` |

## Still to add

- **Milestone photos** (`POST /pools/{id}/photos`): needs Vercel Blob connected first.
