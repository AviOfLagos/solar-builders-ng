// Minimal Paystack API stand-in for local tests.
import http from "node:http";
import crypto from "node:crypto";
const KEY = "sk_test_mock";
const APP = "http://localhost:3000";
const txs = new Map(); const refunds = []; let nextChargeFails = false; let authN = 0;
const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const auth = (code = "AUTH_ok_" + (++authN), sig = "SIG_" + authN) => ({ authorization_code: code, reusable: true, last4: "4081", exp_month: "12", exp_year: "2030", card_type: "visa ", brand: "visa", bank: "TEST BANK", signature: sig, channel: "card" });
async function webhook(event, data, badSig = false) {
  const raw = JSON.stringify({ event, data });
  const sig = badSig ? "deadbeef" : crypto.createHmac("sha512", KEY).update(raw).digest("hex");
  const r = await fetch(APP + "/api/paystack/webhook", { method: "POST", headers: { "content-type": "application/json", "x-paystack-signature": sig }, body: raw });
  return { status: r.status, body: await r.text() };
}
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const b = body ? JSON.parse(body) : {};
  const u = new URL(req.url, "http://x");
  if (!u.pathname.startsWith("/__") && req.headers.authorization !== "Bearer " + KEY) return send(res, 401, { status: false, message: "Invalid key" });
  if (u.pathname === "/transaction/initialize") {
    if (txs.has(b.reference)) return send(res, 400, { status: false, message: "Duplicate Transaction Reference" });
    txs.set(b.reference, { reference: b.reference, amount: b.amount, currency: b.currency, status: "abandoned", channel: "card", metadata: b.metadata, customer: { email: b.email }, channels: b.channels, callback_url: b.callback_url });
    return send(res, 200, { status: true, message: "ok", data: { authorization_url: "https://checkout.paystack.test/" + b.reference, access_code: "ac_" + b.reference, reference: b.reference } });
  }
  const mv = u.pathname.match(/^\/transaction\/verify\/(.+)$/);
  if (mv) { const t = txs.get(decodeURIComponent(mv[1])); return t ? send(res, 200, { status: true, message: "ok", data: t }) : send(res, 400, { status: false, message: "Transaction reference not found" }); }
  if (u.pathname === "/transaction/charge_authorization") {
    if (txs.has(b.reference)) return send(res, 400, { status: false, message: "Duplicate Transaction Reference" });
    const fail = nextChargeFails; nextChargeFails = false;
    const t = { reference: b.reference, amount: b.amount, currency: "NGN", status: fail ? "failed" : "success", channel: "card", metadata: b.metadata, customer: { email: b.email }, authorization: auth(b.authorization_code, "SIG_saved"), gateway_response: fail ? "Declined" : "Approved" };
    txs.set(b.reference, t);
    return send(res, 200, { status: true, message: "Charge attempted", data: t });
  }
  if (u.pathname === "/refund") {
    const t = txs.get(b.transaction);
    if (!t) return send(res, 404, { status: false, message: "Transaction not found" });
    const done = refunds.filter((r) => r.transaction === b.transaction).reduce((a, r) => a + r.amount, 0);
    const amt = b.amount ?? t.amount - done;
    if (done + amt > t.amount || amt <= 0) return send(res, 400, { status: false, message: "Transaction has been fully reversed" });
    refunds.push({ transaction: b.transaction, amount: amt, note: b.merchant_note });
    return send(res, 200, { status: true, message: "Refund has been queued for processing", data: { id: refunds.length, status: "pending" } });
  }
  // ---- test controls ----
  const mp = u.pathname.match(/^\/__pay\/(.+)$/);
  if (mp) {
    const t = txs.get(mp[1]); if (!t) return send(res, 404, { error: "no tx" });
    t.status = u.searchParams.get("status") || "success";
    if (t.status === "success") { t.channel = u.searchParams.get("channel") || "card"; t.authorization = t.channel === "card" ? auth() : { ...auth(), reusable: false, channel: t.channel }; }
    const wh = u.searchParams.get("webhook") ? await webhook("charge.success", { reference: t.reference, amount: t.amount, status: "success" }, u.searchParams.get("webhook") === "bad") : null;
    return send(res, 200, { ok: true, tx: t, webhook: wh });
  }
  if (u.pathname === "/__failnext") { nextChargeFails = true; return send(res, 200, { ok: true }); }
  if (u.pathname === "/__state") return send(res, 200, { txs: [...txs.values()], refunds });
  send(res, 404, { status: false, message: "Not found " + u.pathname });
}).listen(4010, () => console.log("mock paystack on 4010"));
