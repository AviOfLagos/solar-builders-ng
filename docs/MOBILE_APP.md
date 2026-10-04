# Go Solar Me: mobile app build brief

This brief is for the agents building the iOS and Android app. The backend is finished and live, so the app's job is screens on top of the existing API.

- **The API reference:** read [`docs/API.md`](./API.md). It covers every endpoint, request and response.
- **Product rules:** these live in the Product Spec (Claude doc "Go Solar Me — Product Spec").
- **Conflicts:** if this brief and the spec disagree, this brief wins for the app. If the brief and `API.md` disagree, `API.md` wins.

---

## 1. Facts to build against

| What | Value |
|---|---|
| App name | **Go Solar Me** (store brand: Solar Builders NG) |
| Backend repo | `github.com/AviOfLagos/solar-builders-ng` (Next.js 16, branch `main`; pushes auto-deploy to Vercel) |
| API base (now) | `https://solar-ng.vercel.app/api/v1` |
| API base (soon) | `https://solar.nexprove.com/api/v1`. This switches once two DNS records are added at Namecheap. Later the domain will be `solarbuilders.ng`. |
| Rule | **Never hard-code the domain.** Read it from `EXPO_PUBLIC_API_BASE`. |
| Hosting | Vercel team `aviofla`, project `solar-ng`. The database is Neon Postgres, and its tables create and migrate themselves on first use. |
| Payments | Paystack for naira (card, transfer, USSD) is the default. Stripe takes cards from abroad. Both are in **test mode**. |
| Email | Resend sends from `solar@nexprove.com`. Team alerts and customer replies go to the same inbox. |
| Google sign-in | Google Cloud project `solar-builders-ng`, owned by admin@nexprove.com |
| Support | WhatsApp `2347030546907` (`https://wa.me/2347030546907`) |
| Owner | Avi (David Olatunji), Nexprove Limited |

**Test cards**
- Paystack: `4084 0840 8408 4081`, CVV `408`, any future expiry, PIN `0000`, OTP `123456`.
- Stripe: `4242 4242 4242 4242`. A decline: `4000 0000 0000 9995`.

**Secrets**
- Never put secret keys in the app or in chat. The app needs only public values: the API base, the Google client IDs, and the Stripe publishable key, which comes from `GET /payments`.
- The owner pastes server keys into Vercel himself.

---

## 2. Stack (decided)

| Need | Choice |
|---|---|
| Framework | Expo SDK (latest) + React Native + TypeScript, with expo-router (file-based tabs) |
| Server data | TanStack Query (caching, retries, pull-to-refresh) |
| App state | Zustand for the cart and session, persisted with `expo-secure-store` (token) and `AsyncStorage` (cart) |
| Paystack | `react-native-webview` (in-app page, see §6) |
| Stripe | `@stripe/stripe-react-native` (PaymentSheet) |
| Google sign-in | `@react-native-google-signin/google-signin` (native) |
| Apple sign-in | `expo-apple-authentication` |
| Push | `expo-notifications` (Expo push tokens) |
| Images | `expo-image` |
| Sharing | `expo-sharing` and `expo-file-system` (download the share PNG, then open the native sheet) |
| Builds | EAS Build + EAS Submit. Bundle id `ng.solarbuilders.gosolarme`. |

**Where it lives:** a new repo, `AviOfLagos/go-solar-me-app`. It does **not** go inside the web repo.

**Shared rules:** copy the web's shared constants into `src/shared/` and keep them in step:
- `src/config/store.ts`: LGAs, order status words, pool rules, occasions, cart limits
- `src/lib/format.ts`: phone and naira formatting and validation

---

## 3. Design

| Token | Hex | Use |
|---|---|---|
| ink | `#10213B` | Text, dark buttons, card chips |
| ink-2 | `#3A4B63` | Secondary text |
| mute | `#5B6B80` | Hints |
| haze | `#E9EEF2` | App background |
| paper | `#FFFFFF` | Cards |
| line | `#D5DEE6` | Borders |
| sun | `#FFC21A` | Primary button (Pay, Continue) |
| sun-deep | `#E89B00` | Focus ring, accents |
| leaf | `#0E8A5F` | Success, gift credit |
| flare | `#E5482D` | Errors |

**Fonts**
- Bricolage Grotesque for headings, weights 600 and 800.
- Instrument Sans for body text.
- The files are in the web repo's `node_modules/@fontsource-variable/*` and in `assets/fonts/`. Load them with `expo-font`.

**Shape**
- Inputs: 10px radius.
- Cards: 16px radius.
- Buttons: full width on phones, at least 48px tall.

**Money:** always `₦643,370`, with no decimals. Format with the same `naira()` the web uses.

**Tone:** plain Nigerian English, and short.
- Good examples: "Pay ₦498,940", "Chip in", "Lights on", "No more NEPA wahala".
- Errors come from the server's `error` text. Show it as it is.

**Accessibility**
- 44pt minimum touch targets.
- Labels on every input.
- Large text works without clipping.

---

## 4. Screens

There are five tabs, with Go Solar Me in the middle and emphasised. A shared link skips the tabs and opens the pool, build, store or gift card directly (see §7).

| Tab | Screens | API |
|---|---|---|
| **Home** | Calculator (who it's for → appliance chips + hours without NEPA → three tiers → customise); buyer types; package tiers; petrol vs solar line; Friday deals banner; guides and FAQ; "Chat on WhatsApp" | `GET /catalog` (segments, tiers, promo) |
| **Shop** | Categories, brands, search, product page, cart, checkout, buy for someone | `GET /catalog`, `POST /leads`, `GET /gift-cards/{code}`, `POST /checkout`, `POST /payments/{id}` |
| **Go Solar Me** | My pools; start a pool (60 seconds, one typed field); pool page; chip in; fund a part; squad split; owner panel (extend, smaller kit, cancel, add address); share cards | `POST /pools`, `GET /pools/{id}`, `POST /pools/{id}/contribute`, `/close`, `/address`, `GET /share/pool/{id}` |
| **Orders** | Order list, order details and status, receipt, share "Lights on" picture, get help on WhatsApp | `GET /me/orders`, `GET /share/order/{ref}` |
| **Me** | Sign in (Google, Apple, email); saved cards (add, rename, remove); last address; gift cards (buy, check balance); pay small small; installer store; settings; sign out; delete account | `GET /me`, `/cards/*`, `POST /gift-cards`, `POST /finance`, `POST /stores`, `GET /me/store` |

**Calculator logic** is in the web repo. Port it from these files:
- `src/components/PowerPlanner.tsx` (appliance load and hours to a tier)
- `src/data/packages.ts`
- `src/components/FuelVsSolar.tsx`

**Tiers:** `GET /catalog → segments[].tiers[].items` gives the cart lines ready to add.

**Every path ends at:** pick kit → "How do you want to pay?" → order placed → delivered → Lights on.

### "How do you want to pay?" (after a kit is picked)

1. **Pay now** → checkout.
2. **Buy for someone** → checkout with `forSomeoneElse`.
3. **Go Solar Me (public pool)** → start a pool.
4. **Split with squad** → start a pool with `kind: "squad"`.
5. **Gift card** → buy a gift card instead.
6. **Pay small small** → `POST /finance`. This is a request only, and nothing is charged.

---

## 5. Rules the app must keep

**Prices and totals**
- Never send prices. The server prices every cart.
- Send `expectedTotal`, the amount shown on the Pay button.
  - On `409` with `code: "amount_changed"`, show the new `amount` and ask again.
  - On `409` with `code: "gift_changed"`, clear the gift code and ask the buyer to apply it again.

**Gift card split**
- The gift card covers what it can, and any card part stays at least ₦1,000.
- Copy `split()` from the web repo's `src/app/checkout/page.tsx` to show the right total.

**Leads**
- Call `POST /leads` as soon as a valid phone or email exists. That's the first add to cart, or the checkout phone field on blur.
- Keep the returned `id` and send it again as the cart changes. Pass it as `leadId` at checkout.
- Show the consent line: "OK to message me about this order on WhatsApp."

**Delivery and limits**
- Lagos only. The LGA comes from `store.lgas`, picked as a chip and never typed.
- Prefill from `GET /me → lastDelivery`.
- Cart limits: 40 lines, 50 of each item, ₦100m total.

**Phones and money**
- Phones: accept any typing. The server normalises to `+234…`.
- Money is whole naira. Never send kobo.

**Accounts and errors**
- No account is needed to buy or chip in. After paying a guest, offer "Save this to an account" (Google).
- Error UI: show `error` at the top, and each `fields[key]` under its input. Block double taps while a request runs.
- A `401` anywhere means: clear the token and show sign-in. Keep the cart.

---

## 6. Payments in the app

**Step 1: what's switched on.** Call `GET /payments`, which returns `{ naira, intl, minCharge, stripePublishableKey }`. Show the choice "Pay in naira / Card from abroad" only when both are on. The default is naira.

**Step 2: Paystack (naira).** The start call (`/checkout`, `/pools/{id}/contribute` or `/gift-cards`) with `provider: "paystack"` returns `{ id: "ps_…", authorizationUrl }`.

1. Open `authorizationUrl` in a full-screen `WebView` modal.
2. Watch `onShouldStartLoadWithRequest`. When the URL starts with any of these, close the modal and **don't** load the page:
   - `{SITE}/checkout/success`
   - `{SITE}/fund/`
   - `{SITE}/gift-cards`
   - `{SITE}/account/cards`

   `{SITE}` is the API base without `/api/v1`.
3. Call `POST /payments/{id}` with body `{}`. What it returns decides the screen:

   | `paymentStatus` | Show |
   |---|---|
   | `succeeded` and `ok` | Success screen |
   | `processing` or `pending` | Poll every 5s, up to 12 times, then: "Your bank is still confirming. We'll email you." |
   | `canceled` or `failed` | Failure screen, and call `POST /payments/{id}/cancel` with `{}` |
   | `ok: false` with `error` | Show `error`. Example: the payment was refunded. |
4. If the user closes the modal by hand, still call `POST /payments/{id}`. They may have paid.

**Step 3: Stripe (card from abroad).**
1. Call with `provider: "stripe"`. It returns `{ id: "pi_…", clientSecret }`.
2. Run `initPaymentSheet` with `paymentIntentClientSecret` and the publishable key from `GET /payments`, then `presentPaymentSheet`.
3. Call `POST /payments/{id}` with `{ clientSecret }`.
4. On failure, call `POST /payments/{id}/cancel` with `{ clientSecret }`.

**Step 4: saved cards.** `GET /me → cards[]`. Each card has a `provider`; show only the ones matching the chosen method. Send the card's `id` as `savedCardId`.
- A Paystack saved card usually returns `paymentStatus: "succeeded"` straight away, with no page.
- If it returns `authorizationUrl`, open it as in Step 2.
- Saving a card: `saveCard: true` + `cardNickname`. This works only when signed in, and only for card payments.
- Adding a card from Me: `POST /cards/setup` → Paystack page (a ₦100 check, refunded) → intercept `{SITE}/account/cards?reference=…` → `PUT /cards/setup` with `{ reference }`.

**Step 5: success screens.**

| Kind | Screen | Share picture |
|---|---|---|
| Order | Order ref, "We'll call you on …" | `/share/order/{ref}?f=story` |
| Chip-in | Accepted amount, plus any refund line | `/share/pool/{id}?f=story` |
| Gift card | The code in big type, with copy and share buttons | – |

**Background facts the app can rely on** (no app work needed):
- **Late payments count.** If a buyer pays after their order lapsed, the order still completes. The money is refunded only if their gift card balance was spent in between.
- **Overpayment is impossible.** If two people pay the last part of a pool at once, the second is refunded automatically.

---

## 7. Links, deep links and sharing

**Paths the app must open:**

| Path | Opens |
|---|---|
| `/fund/{id}` | Pool page |
| `/b/{id}` | Saved build (add all to cart) |
| `/s/{slug}` | Installer store (keep `ref = slug` for commission; send it as `ref` at checkout) |
| `/cart?resume={leadId}` | `GET /leads/{id}`, which restores the cart |
| `/product/{slug}` | Product page |
| `/packages/{slug}` | Buyer type |

**How they open**
- Custom scheme: `gosolarme://`.
- Universal and App Links on the final domain need `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on the website. Add those routes to the **web repo** once the bundle IDs and the domain are final.

**Sharing:** download the PNG from `/share/...`, then share it with the page link. WhatsApp first.

---

## 8. Implementation steps (in order, each with a gate)

1. **Scaffold.**
   - Build: Expo app, tabs, fonts, colour tokens, API client (base URL from env, Bearer token, error shape), TanStack Query, `GET /catalog` cached.
   - Gate: the catalog renders on iOS and Android.
2. **Browse and cart.**
   - Build: Home calculator → tiers → customise; Shop with categories, search and product page; cart with limits; `POST /leads` capture.
   - Gate: four taps to a kit, with no typing.
3. **Sign-in.**
   - Build: email register and login, then Google native. For Google, create iOS and Android OAuth client IDs in Google Cloud `solar-builders-ng`. Avi adds them to Vercel `GOOGLE_CLIENT_IDS`, comma-separated.
   - Gate: the token is saved, `GET /me` works, and a `401` returns to sign-in.
4. **Checkout + Paystack.**
   - Build: checkout form with prefill, gift code, `expectedTotal`, WebView flow, success and failure screens.
   - Gate: a test card payment completes and the order shows in Orders.
5. **Stripe + saved cards.**
   - Build: PaymentSheet; saved cards for both providers; add, rename and remove cards.
   - Gate: a saved Paystack card pays with no page.
6. **Go Solar Me.**
   - Build: start a pool (public and squad), pool page, chip in, fund a part, owner panel, share pictures.
   - Gate: two test supporters fund a pool, the order appears, and the second payer's overpay is refunded.
7. **Gift cards, pay small small, installer store.**
   - Gate: a gift code bought in the app pays part of an order.
8. **Backend additions** (in the **web repo**; same code style, same `route()` and `HttpError` helpers in `src/lib/server/api.ts`).
   - Build: the endpoints in §9.
   - Gate: lint, type check and build are clean, the e2e payment checks still pass (`scripts/e2e/README.md`), and the new endpoints are added to `docs/API.md`.
9. **Push notifications.**
   - Build: register a token on sign-in; the server sends the §10 events.
   - Gate: chipping in sends the pool owner a push.
10. **Store readiness.**
    - Build: Apple sign-in, delete account, privacy labels, icons and splash, EAS builds, TestFlight and Play internal testing.
    - Gate: both store reviews pass.

---

## 9. Backend endpoints still to add (web repo)

| Endpoint | What it does | Notes |
|---|---|---|
| `POST /auth/apple` | `{ identityToken, fullName? }` → `{ user, token }` | Verify against Apple's JWKS (`https://appleid.apple.com/auth/keys`), audience = bundle ID. Mirror `src/lib/server/google.ts`. The column `users.apple_sub` already exists. **Required by Apple** when Google sign-in is offered. |
| `DELETE /me` | Delete my account | Remove saved Paystack cards (`paystack_cards`) and detach Stripe cards. Anonymise `users` (email → `deleted+{id}@invalid`, clear the name, phone, password and `google_sub`/`apple_sub`). Keep orders and the ledger for records. Close the user's open pools via `cancelPool()`. **Required by Apple 5.1.1(v)** and Google Play. |
| `PATCH /me` | Edit name and phone | Validate like `/auth/register` |
| `POST /me/devices` · `DELETE /me/devices/{token}` | Register or remove an Expo push token | New table `devices(token pk, user_id, platform, created_at)` in the `SCHEMA` string in `src/lib/server/db.ts`. Migrations run themselves. |
| `POST /auth/reset` + `POST /auth/reset/confirm` | Forgot password | Email a 6-digit code with `sendMail()` (Resend works now). The code lasts 15 minutes; rate-limit it. |
| `POST /pools/{id}/photos` | Owner adds milestone photos | Needs file storage. Use Vercel Blob (`@vercel/blob`); Avi connects it in Vercel. Add a `pool_photos` table. |
| `GET /orders/{ref}` (optional) | One order with its full items | `/me/orders` already returns everything needed |

---

## 10. Push notifications (server sends, app shows)

| Event | To | Tap opens |
|---|---|---|
| Order paid / confirmed / out for delivery / delivered / installed | Buyer | Order details |
| Someone chipped in | Pool owner | Pool page |
| Pool 25 / 50 / 75 / 100% | Owner (at 100%, every signed-in supporter) | Pool page |
| Pool has 3 days left; deadline passed (choose next step) | Owner | Owner panel |
| Sale through your store link | Installer | My store |

**Where to send from**
- `orderNotifications()` and `setOrderStatus()` in `src/lib/server/orders.ts`
- `finalizeContribution()` and `sweepPools()` in `src/lib/server/pools.ts`

**How:** use Expo's push API (`https://exp.host/--/api/v2/push/send`).

---

## 11. Files to read first (web repo)

| File | Why |
|---|---|
| `docs/API.md` | Every endpoint and both payment flows |
| `docs/MOBILE_APP.md` | This brief |
| `AGENTS.md` | Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before changing web code. |
| `src/config/store.ts` | LGAs, statuses, pool rules, occasions, cart limits |
| `src/lib/format.ts` | Phone, email, name and naira helpers |
| `src/lib/server/api.ts` | Route wrapper, errors, rate limits, auth helpers |
| `src/lib/server/pay.ts`, `paystack.ts`, `stripe.ts` | The payment layer |
| `src/lib/server/orders.ts`, `pools.ts`, `payments.ts` | Checkout, gift cards, pools, finalising payments |
| `src/lib/server/db.ts` | The whole schema in one string |
| `src/app/checkout/page.tsx`, `src/app/fund/[id]/Contribute.tsx` | The web versions of the two main money screens |
| `src/components/PowerPlanner.tsx`, `src/data/packages.ts` | Calculator logic |
| `scripts/e2e/` | 46 payment checks against a fake Paystack |
| `.env.example` | Every environment variable |

---

## 12. What Avi owns (agents can't do these)

- **Domain DNS:** add two records at Namecheap (nexprove.com → Advanced DNS):
  - TXT `_vercel` = `vc-domain-verify=solar.nexprove.com,eabcac23264ec36d60e9`
  - CNAME `solar` = `cname.vercel-dns.com`

  Then set `NEXT_PUBLIC_SITE_URL=https://solar.nexprove.com` in Vercel, and add that origin to the Google OAuth client.
- **Google and push:** add the iOS and Android Google client IDs to `GOOGLE_CLIENT_IDS` in Vercel.
- **Store accounts:** Apple Developer and Google Play accounts (under Nexprove Limited), plus the store listings.
- **Going live with payments:** Paystack business verification, then live keys in Vercel (`PAYSTACK_SECRET_KEY`, and Stripe's). Also set the live webhook URL in Paystack to `{SITE}/api/paystack/webhook`.
- **Legal:** a lawyer's read of the terms, privacy and Go Solar Me rules (`src/data/legal.ts`) before the public launch.
