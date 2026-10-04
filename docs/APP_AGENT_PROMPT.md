# Prompt for the app-building agent (Kiro)

Copy everything below the line into the agent.

---

You are building **Go Solar Me**, the iOS and Android app for Solar Builders NG. The backend is finished and live; you build the app on top of it. Work phase by phase. Do not start a phase until the one before it passes its gate, and report the gate result to me.

## 0. Read first, in this order

1. `docs/MOBILE_APP.md` in `AviOfLagos/solar-builders-ng`: the brief. **If anything conflicts, it wins.**
2. `docs/API.md` in the same repo: every endpoint with its request and response.
3. Your own plan: `.kiro/specs/building-go-solar-me-app/tasks.md`.

Run `git pull` in your local `solar-builders-ng` clone before reading. Your copy is behind `main`.

## 1. Housekeeping before Phase 0

1. In the local `solar-builders-ng` clone, move the untracked `mobile/` folder out. The app does **not** live in the web repo. Then pull `main`.
2. Clone `AviOfLagos/go-solar-me-app` (it exists and is empty) and build there.
3. **Fix `tasks.md`** with every correction in §2 below, then show me the diff before writing app code.

## 2. Corrections to `tasks.md` (these are errors; fix them)

**Backend and accounts**

| Item in `tasks.md` | Correct version |
|---|---|
| "Backend prerequisites" | All done and live: `POST /auth/apple`, `POST /me/devices`, `DELETE /me`, plus `PATCH /me`, `POST /auth/reset` + `/auth/reset/confirm`. Tick them. The server already **sends** pushes, so Phase 7 is app-side only. |
| Open items | Done or not needed: the email is solar@nexprove.com, and **no gosolarme.app** (the domain is solar.nexprove.com). |

**Config and stack**

| Item in `tasks.md` | Correct version |
|---|---|
| Tabs: Home, Shop, Go Solar Me, Gift, Account | **Home, Shop, Go Solar Me, Orders, Me** (brief §4). Gift cards live under Me. |
| `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_API_BASE` = `https://solar.nexprove.com/api/v1`. It's live; `https://solar-ng.vercel.app/api/v1` also works. Never hard-code it. |
| Copy `catalog.ts` and `pricing.json` from the web repo | **Don't.** The catalog and prices come only from `GET /catalog`. Copy only `src/lib/format.ts` and the constants in `src/config/store.ts`. |
| `GoogleService-Info.plist` needed | Not needed: Google sign-in doesn't use Firebase. **`google-services.json` is** needed, but only for Android push (FCM, set up in EAS). |

**Payments, cart and leads**

| Item in `tasks.md` | Correct version |
|---|---|
| Customise "re-calls `POST /checkout` (price-only mode)" | There is **no price-only mode**. `POST /checkout` starts a real payment. Show live prices from the catalog data. |
| Paystack via `expo-web-browser` redirect | Use a **`react-native-webview` modal** and intercept the return URLs (brief §6). The auth session won't auto-close on an https callback. |
| Gift card in Phase 4 | That phase covers two things: **buying** a gift card (`POST /gift-cards`), and **applying** a code at checkout (`GET /gift-cards/{code}` + `giftCode` on `POST /checkout`). |
| "Every cart change PATCHes the lead record" | There's no PATCH. Call `POST /leads` again with the same `id`. |
| Deep link `gosolarme://leads/{id}` | The resume link is `/cart?resume={leadId}` (`gosolarme://cart?resume=…`). Restore it with `GET /leads/{id}`. |

**Google sign-in**

| Item in `tasks.md` | Correct version |
|---|---|
| Android Google client ID | It needs the app's **SHA-1 signing fingerprint**. Run `eas credentials` after the first Android build, send the SHA-1 to Avi, and the Android client gets created. Until then, Android sign-in still works via `webClientId` (the web client ID, which the server already accepts). |
| iOS Google client ID | Avi is creating it now. Read it from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and set the URL scheme through the google-signin config plugin. |

## 3. Rules for every phase

**API and data**
- **Money:** whole naira, never kobo, and never send prices. Always send `expectedTotal`.
  - On `409` with `amount_changed`, show the new amount.
  - On `409` with `gift_changed`, clear the code.
- **Errors:** every API error is `{ error, fields?, code? }`. Show `error` at the top and each `fields[key]` under its input.
  - `401`: clear the token, keep the cart, show sign-in.
  - `429`: "Too many tries, wait a moment".
  - `503`: offer WhatsApp.
- **No duplicate calls:** block double taps on every submit. One in-flight request per action.
- **Server state** goes through TanStack Query. Never keep it in Zustand.

**Payments**
- Payments always end with `POST /payments/{id}`. Never treat a payment as done because a page loaded.
- On cancel or failure, call `POST /payments/{id}/cancel`.

**Secrets and accounts**
- **No secrets in the app.** Only public values go in: the API base, the Google client IDs, and the Stripe publishable key, which comes from `GET /payments`.
- **Guests can buy and chip in.** Never force sign-in for those.
- Use the brief's copy, design tokens and fonts. Naira is always written as `₦643,370`.

## 4. Definition of done for every phase (no exceptions)

1. **Static checks:** `npx tsc --noEmit` shows zero errors, and `npx expo lint` shows zero errors.
2. **Device check:** the app starts with no red screen and no yellow-box warnings in your code on **iOS and Android**. Use an Expo dev build on a real device for anything native: payments, Google, Apple, push.
3. **Gate:** the phase's gate from `tasks.md` passes, with the API in test mode.
   - Paystack test card: `4084 0840 8408 4081`, CVV `408`, PIN `0000`, OTP `123456`.
   - Stripe test card: `4242 4242 4242 4242`.
4. **States:** every new screen handles loading, empty, error-with-retry and offline.
5. **Ship it:** commit with a clear message, push to `main` of `go-solar-me-app`, and tick the tasks in `tasks.md`.
6. **Report to me** in five lines or fewer: what's done, the gate result, and anything blocked and on whom.

## 5. When you're blocked

**Never change the backend.** If you think it needs a change (a missing field, a wrong response), stop and write it up for the web repo: the endpoint, what you sent, what came back, and what you need. Don't work around it in the app.

**These are Avi's to do:**
- Apple Developer and Play accounts
- Google client IDs
- live payment keys
- store listings
- Vercel Blob for milestone photos (keep that screen as "coming soon")

## 6. Start now

Do §1, then send me the `tasks.md` diff. After I say go, start Phase 0.
