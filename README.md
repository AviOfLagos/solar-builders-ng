# Solar Builders NG

Lagos solar e-commerce storefront: Felicity, itel, Sun King, Arnergy and EcoFlow.

- **Pricing**: official brand price + 1% (`src/config/store.ts` → `markup`), rounded up to ₦10. Catalog in `src/data/catalog.json` (rebuild with `scripts/build-catalog.py`).
- **Solar Friday**: display-only discount (`PROMO` in `src/config/store.ts`). The struck-through price is derived so the customer always pays the normal selling price.
- **Checkout**: Lagos-only delivery (LGA picker), phone + alternate phone, optional installer request (not charged). Card payments via Stripe PaymentIntents in NGN.
- **Saved cards**: shoppers sign in with an emailed 6-digit code (Brevo), see their cards newest-first, name/rename/remove them, and pick one at checkout.
- **After payment**: order stays *pending*. Customer gets a "we've got your order" email; owner gets an alert email (+ WhatsApp Cloud API if configured). Stripe PaymentIntent metadata is the order record for now.
- **SEO/AEO**: per-page metadata, Product/Store/FAQ/Breadcrumb JSON-LD, sitemap, robots, `/llms.txt`, buying guides.

## Run
```bash
cp .env.example .env.local   # fill in keys
npm install && npm run dev
```
Stripe test card: `4242 4242 4242 4242`, any future date, any CVC.
