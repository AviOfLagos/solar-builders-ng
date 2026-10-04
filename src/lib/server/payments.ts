import "server-only";
import { db } from "./db";
import { mailConfigured } from "./mail";
import { fetchPayment, refundPayment, savePaystackCard, type Paid } from "./pay";
import { finalizeOrder, finalizeGiftCard } from "./orders";
import { finalizeContribution } from "./pools";
import type { Session } from "./session";

/** Idempotent: the success page, the app and both webhooks can all call it for the same payment. */
export async function finalizePayment(p: Paid) {
  if (p.status !== "succeeded") return { ok: false, paymentStatus: p.status };
  if (p.metadata.kind === "contribution") return finalizeContribution(p);
  if (p.metadata.kind === "gift_card") return finalizeGiftCard(p);
  if (p.metadata.kind === "order") return finalizeOrder(p);
  if (p.metadata.kind === "card_setup") return finalizeCardSetup(p);
  return { ok: false, error: "Unknown payment" };
}

/** Adding a naira card: Paystack charges ₦100 to check it, we keep the card and refund the ₦100. */
async function finalizeCardSetup(p: Paid) {
  if (p.provider !== "paystack" || !p.metadata.user_id) return { ok: false, error: "Unknown payment" };
  const card = await savePaystackCard(p, p.metadata.user_id, p.metadata.card_nickname || "");
  // A second refund of the same payment is refused by Paystack, which is what we want.
  await refundPayment(p.ref, undefined, "card check").catch(() => {});
  return card ? { ok: true, kind: "card_setup", card } : { ok: false, error: "That card can't be saved. Try a different card." };
}

/**
 * Completes a payment and says what it bought. Details (phone, email, gift code) are only returned to
 * whoever holds the payment's secret or owns the order. For Stripe the secret is the client secret;
 * a Paystack reference is random and only ever sent to the payer, so holding it is enough.
 */
export async function paymentSummary(ref: string, clientSecret: string, viewer: Session | null) {
  const p = await fetchPayment(ref);
  if (!p) return null;
  const r = await finalizePayment(p);
  const kind = p.metadata.kind || "order";
  const base = { provider: p.provider, paymentStatus: p.status, amount: p.amount, kind, emailed: mailConfigured(), ok: r.ok };
  const sql = await db();

  if (kind === "contribution") {
    const [pool] = await sql`select id, title, goal, raised, status from pools where id = ${p.metadata.pool_id ?? ""}`;
    const [c] = await sql`select amount, refunded from contributions where pi_id = ${p.ref}`;
    return { ...base, pool: pool ?? null, accepted: c?.amount ?? 0, refunded: c?.refunded ?? 0 };
  }

  const allowed = p.provider === "paystack" || (!!clientSecret && clientSecret === p.clientSecret);
  if (kind === "gift_card") {
    const [g] = await sql`select code, amount, to_name, status from gift_cards where pi_id = ${p.ref}`;
    return { ...base, gift: allowed && g?.status === "active" ? { code: g.code, amount: g.amount, toName: g.to_name } : null };
  }
  if (kind === "card_setup") return { ...base, card: "card" in r ? r.card : null, error: "error" in r ? r.error : undefined };

  const [o] = await sql`select id, user_id, buyer, delivery, recipient, installer, status, pool_id, total_paid, gift_card_used from orders where pi_id = ${p.ref}`;
  if (!o) return { ...base, order: null };
  const mine = allowed || (!!viewer && viewer.uid === o.user_id);
  return { ...base, order: mine ? { ref: o.id, total: o.total_paid + o.gift_card_used, giftUsed: o.gift_card_used, phone: o.delivery.phone, email: o.buyer.email, installer: o.installer, recipient: o.recipient ? { name: o.recipient.name } : null, status: o.status } : { ref: o.id, status: o.status }, error: "error" in r ? r.error : undefined };
}
