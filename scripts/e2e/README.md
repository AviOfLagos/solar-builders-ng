# Payment end-to-end checks (local)

Runs every Paystack path against a local stand-in for Paystack: checkout, saved cards, gift cards,
late payments, Go Solar Me overshoot refunds, adding a card, transfers.

```
service postgresql start                       # or any local Postgres in DATABASE_URL
npm run build
node scripts/e2e/paystack-mock.mjs &           # fake Paystack on :4010
PAYSTACK_SECRET_KEY=sk_test_mock PAYSTACK_API_BASE=http://localhost:4010 STRIPE_SECRET_KEY= npx next start -p 3000 &
DATABASE_URL=postgres://user:pass@localhost:5432/solar node scripts/e2e/payments.test.mjs
```

Expect "46 passed, 0 failed". `account.test.mjs` (same setup) checks profile edit, push devices, password reset and account deletion.

Never point either at production.
