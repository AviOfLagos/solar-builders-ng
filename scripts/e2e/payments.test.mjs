import postgres from "postgres";
const APP = "http://localhost:3000/api/v1", MOCK = "http://localhost:4010";
const sql = postgres(process.env.DATABASE_URL);
let cookie = ""; let pass = 0, failN = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log("  ✓", m); } else { failN++; console.log("  ✗", m, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ""); } };
async function api(path, body, opts = {}) {
  const r = await fetch(APP + path, { method: opts.method || (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(opts.anon ? {} : cookie ? { cookie } : {}), "x-forwarded-for": "10.0.0." + Math.floor(Math.random() * 250) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); if (sc && !opts.anon) { const m = sc.match(/sb_session=[^;]+/); if (m) cookie = m[0]; }
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
const pay = (ref, q = "") => fetch(`${MOCK}/__pay/${ref}?${q}`).then((r) => r.json());
const state = () => fetch(`${MOCK}/__state`).then((r) => r.json());
import { readFileSync } from "node:fs";
const CATALOG = JSON.parse(readFileSync(new URL("../../src/data/products.json", import.meta.url))).products;
const priced = (id) => ({ id, price: CATALOG.find((p) => p.id === id).price });
const P1 = priced("4f0c60fd"), P2 = priced("f26549e3");
const email = `t${Date.now()}@example.com`;
const delivery = { name: "Ada Obi", email, phone: "08031234567", address: "12 Allen Avenue, Ikeja", lga: "Ikeja" };

console.log("options");
const o = await api("/payments");
ok(o.naira === true && o.intl === false, "naira on, intl off", o);

console.log("register");
const reg = await api("/auth/register", { name: "Ada Obi", email, phone: "08031234567", password: "Tq7-vK2mZx9-sun" });
ok(reg.status === 200 && cookie, "registered", reg);

console.log("checkout: new card, save it");
const c1 = await api("/checkout", { items: [{ id: P1.id, qty: 1 }], ...delivery, expectedTotal: P1.price, saveCard: true, cardNickname: "GTB salary", provider: "paystack" });
ok(c1.provider === "paystack" && /^ps_/.test(c1.id) && c1.authorizationUrl, "got Paystack page", c1);
let st = await state(); const t1 = st.txs.find((t) => t.reference === c1.id);
ok(t1 && t1.amount === P1.price * 100 && t1.metadata.order_ref === c1.ref && t1.metadata.save_card === "1" && t1.callback_url === "http://localhost:3000/checkout/success" && t1.metadata.cancel_action.includes(c1.id), "Paystack got right amount, metadata, callback", t1);
let s1 = await api(`/payments/${c1.id}`, {});
ok(s1.paymentStatus === "canceled" && s1.ok === false, "before paying: canceled/not ok", s1);
let [ord] = await sql`select status from orders where id = ${c1.ref}`;
ok(ord.status === "awaiting_payment", "order still awaiting (abandoned status alone doesn't expire on summary)", ord);
await pay(c1.id);
s1 = await api(`/payments/${c1.id}`, {}, { anon: true });
ok(s1.paymentStatus === "succeeded" && s1.ok && s1.order?.ref === c1.ref && s1.order?.phone, "paid: summary has order details (ref possession)", s1);
[ord] = await sql`select status from orders where id = ${c1.ref}`;
ok(ord.status === "pending", "order pending", ord);
const led = await sql`select kind, amount from ledger where pi_id = ${c1.id}`;
ok(led.length === 1 && led[0].kind === "payment" && led[0].amount === P1.price, "one ledger payment", led);
const again = await api(`/payments/${c1.id}`, {});
const led2 = await sql`select count(*)::int n from ledger where pi_id = ${c1.id}`;
ok(again.ok && led2[0].n === 1, "idempotent second call");

console.log("saved card");
const me = await api("/me");
const card = me.cards?.find((c) => c.provider === "paystack");
ok(card && card.nickname === "GTB salary" && card.last4 === "4081" && /^pc_/.test(card.id), "card saved with nickname", me.cards);
ok(!JSON.stringify(me).includes("AUTH_ok"), "authorization code never sent to the browser");
const c2 = await api("/checkout", { items: [{ id: P2.id, qty: 1 }], ...delivery, expectedTotal: P2.price, savedCardId: card.id });
ok(c2.paymentStatus === "succeeded" && !c2.authorizationUrl, "saved card charged directly", c2);
[ord] = await sql`select status from orders where id = ${c2.ref}`;
ok(ord.status === "pending", "saved-card order pending", ord);
await fetch(MOCK + "/__failnext");
const c3 = await api("/checkout", { items: [{ id: P2.id, qty: 1 }], ...delivery, expectedTotal: P2.price, savedCardId: card.id });
ok(c3.status === 402, "declined saved card → 402", c3);
const [o3] = await sql`select status from orders where pi_id like 'ps_%' order by created_at desc limit 1`;
ok(o3.status === "expired", "declined order expired", o3);
const ren = await api(`/cards/${card.id}`, { nickname: "Renamed" }, { method: "PATCH" });
ok(ren.ok, "rename naira card", ren);
const other = await api(`/cards/${card.id}`, null, { method: "DELETE", anon: true });
ok(other.status === 401 || other.status === 404, "anon can't delete", other);

console.log("gift card bought by Paystack, confirmed by webhook");
const g = await api("/gift-cards", { amount: 600000, fromName: "Ada Obi", fromEmail: email, toName: "Mum", provider: "paystack" }, { anon: true });
ok(g.authorizationUrl && /^ps_/.test(g.id), "gift card Paystack page", g);
const bad = await pay(g.id, "webhook=bad");
ok(bad.webhook.status === 400, "bad webhook signature rejected", bad.webhook);
let [gc] = await sql`select code, status, balance from gift_cards where pi_id = ${g.id}`;
ok(gc.status === "pending", "still pending after bad webhook");
const good = await pay(g.id, "webhook=1");
ok(good.webhook.status === 200, "good webhook accepted", good.webhook);
[gc] = await sql`select code, status, balance from gift_cards where pi_id = ${g.id}`;
ok(gc.status === "active" && gc.balance === 600000, "gift card active from webhook alone", gc);
const gs = await api(`/payments/${g.id}`, {}, { anon: true });
ok(gs.gift?.code === gc.code, "success page shows code to the payer", gs);

console.log("gift + Paystack, then cancel releases the hold");
const total = P1.price;
const c4 = await api("/checkout", { items: [{ id: P1.id, qty: 1 }], ...delivery, giftCode: gc.code, expectedTotal: total - 600000, provider: "paystack" });
ok(c4.authorizationUrl && c4.amount === total - 600000, "partial gift, rest on Paystack", c4);
[gc] = await sql`select balance from gift_cards where code = ${gc.code}`;
ok(gc.balance === 0, "gift held", gc);
const early = await api(`/payments/${c4.id}/cancel`, {});
// status is 'abandoned' → canceled, so it releases
[gc] = await sql`select balance from gift_cards where pi_id = ${g.id}`;
ok(early.ok && gc.balance === 600000, "cancel released the hold", { early, gc });
const lateRef = c4.id;
await pay(lateRef);
const late = await api(`/payments/${lateRef}`, {});
[gc] = await sql`select balance from gift_cards where pi_id = ${g.id}`;
const [o4] = await sql`select status from orders where pi_id = ${lateRef}`;
ok(late.ok && o4.status === "pending" && gc.balance === 0, "paid late: order revived, gift held again", { late, o4, gc });
st = await state();
ok(!st.refunds.some((r) => r.transaction === lateRef), "nothing refunded");

console.log("paid late after the gift card was spent → refunded");
const g2 = await api("/gift-cards", { amount: 600000, fromName: "Ada Obi", fromEmail: email, provider: "paystack" }, { anon: true });
await pay(g2.id, "webhook=1");
const [gc2] = await sql`select code from gift_cards where pi_id = ${g2.id}`;
const c7 = await api("/checkout", { items: [{ id: P1.id, qty: 1 }], ...delivery, giftCode: gc2.code, expectedTotal: total - 600000, provider: "paystack" });
await api(`/payments/${c7.id}/cancel`, {});
const spend = await api("/checkout", { items: [{ id: P2.id, qty: 1 }], ...delivery, giftCode: gc2.code, expectedTotal: 0 });
ok(spend.paid, "gift spent on another order", spend);
await pay(c7.id, "webhook=1");
const late2 = await api(`/payments/${c7.id}`, {});
st = await state();
const [o7] = await sql`select status from orders where pi_id = ${c7.id}`;
ok(late2.ok === false && late2.error && o7.status === "refunded" && st.refunds.filter((r) => r.transaction === c7.id && r.amount === (total - 600000) * 100).length === 1, "refunded once, page says so", { late2, o7 });
await api(`/payments/${c7.id}`, {});
st = await state();
ok(st.refunds.filter((r) => r.transaction === c7.id).length === 1, "late refund happens once");

console.log("Go Solar Me with Paystack, overshoot refund");
const pool = await api("/pools", { items: [{ id: P2.id, qty: 1 }], kind: "public", lga: "Ikeja", recipientPhone: "08031234567", deadlineDays: 14 });
ok(pool.id, "pool created", pool);
const a = await api(`/pools/${pool.id}/contribute`, { email: "a@example.com", name: "Bola", amount: P2.price, provider: "paystack" }, { anon: true });
const b = await api(`/pools/${pool.id}/contribute`, { email: "b@example.com", name: "Chi", amount: P2.price, provider: "paystack" }, { anon: true });
ok(a.authorizationUrl && b.authorizationUrl, "two full chip-ins started", { a, b });
st = await state();
ok(st.txs.find((t) => t.reference === a.id)?.metadata.cancel_action === `http://localhost:3000/fund/${pool.id}`, "cancel goes back to the pool page");
await pay(a.id, "webhook=1"); await pay(b.id, "webhook=1");
const [pl] = await sql`select status, raised from pools where id = ${pool.id}`;
ok(pl.status === "funded" && pl.raised === P2.price, "pool funded once", pl);
st = await state();
ok(st.refunds.some((r) => r.transaction === b.id && r.amount === P2.price * 100), "second chip-in refunded in full", st.refunds);
const bs = await api(`/payments/${b.id}`, {}, { anon: true });
ok(bs.kind === "contribution" && bs.accepted === 0 && bs.refunded === P2.price, "second payer sees refund", bs);

console.log("add a naira card from the account page");
const cs = await api("/cards/setup", { nickname: "Zenith", provider: "paystack" });
ok(cs.authorizationUrl, "card check page", cs);
st = await state(); const ct = st.txs.find((t) => t.reference === cs.id);
ok(ct.amount === 10000 && JSON.stringify(ct.channels) === '["card"]' && ct.callback_url === "http://localhost:3000/account/cards", "₦100, card only, back to cards page", ct);
await pay(cs.id);
const put = await api("/cards/setup", { reference: cs.id }, { method: "PUT" });
ok(put.ok, "card saved after check", put);
st = await state();
ok(st.refunds.some((r) => r.transaction === cs.id && r.amount === 10000), "₦100 refunded", st.refunds);
const me2 = await api("/me");
ok(me2.cards.filter((c) => c.provider === "paystack").length === 2 && me2.cards.some((c) => c.nickname === "Zenith"), "two naira cards", me2.cards);
const put2 = await api("/cards/setup", { reference: cs.id }, { method: "PUT" });
st = await state();
ok(put2.ok && st.refunds.filter((r) => r.transaction === cs.id).length === 1, "repeat is harmless, refunded once", put2);

console.log("transfer payment: not saved as a card");
const c5 = await api("/checkout", { items: [{ id: P2.id, qty: 1 }], ...delivery, expectedTotal: P2.price, saveCard: true, provider: "paystack" });
await pay(c5.id, "channel=bank_transfer");
const s5 = await api(`/payments/${c5.id}`, {});
const me3 = await api("/me");
ok(s5.ok && me3.cards.length === 2, "transfer paid, no card saved", { s5, n: me3.cards.length });

console.log("pending transfer isn't cancelled by the browser");
const c6 = await api("/checkout", { items: [{ id: P2.id, qty: 1 }], ...delivery, expectedTotal: P2.price, provider: "paystack" });
await pay(c6.id, "status=ongoing");
const s6 = await api(`/payments/${c6.id}`, {});
const k6 = await api(`/payments/${c6.id}/cancel`, {});
const [o6] = await sql`select status from orders where id = ${c6.ref}`;
ok(s6.paymentStatus === "processing" && k6.ok === false && o6.status === "awaiting_payment", "ongoing stays open", { s6, k6, o6 });

console.log(`\n${pass} passed, ${failN} failed`);
await sql.end();
process.exit(failN ? 1 : 0);
