import "server-only";
import type Stripe from "stripe";
import { db } from "./db";
import { stripe } from "./stripe";
import { mailConfigured } from "./mail";
import { finalizeOrder, finalizeGiftCard } from "./orders";
import { finalizeContribution } from "./pools";
import type { Session } from "./session";

/** Idempotent: the success page, the app and the webhook can all call it for the same payment. */
export async function finalizePayment(pi: Stripe.PaymentIntent) {
  if (pi.status !== "succeeded") return { ok: false, paymentStatus: pi.status };
  if (pi.metadata.kind === "contribution") return finalizeContribution(pi);
  if (pi.metadata.kind === "gift_card") return finalizeGiftCard(pi);
  if (pi.metadata.kind === "order") return finalizeOrder(pi);
  return { ok: false, error: "Unknown payment" };
}

/**
 * Completes a payment and says what it bought. Details (phone, email, gift code) are only
 * returned to whoever holds the payment's client secret or owns the order.
 */
export async function paymentSummary(piId: string, clientSecret: string, viewer: Session | null) {
  const pi = await stripe().paymentIntents.retrieve(piId).catch(() => null);
  if (!pi) return null;
  const r = await finalizePayment(pi);
  const kind = pi.metadata.kind || "order";
  const base = { paymentStatus: pi.status, amount: pi.amount / 100, kind, emailed: mailConfigured(), ok: r.ok };
  const sql = await db();

  if (kind === "contribution") {
    const [p] = await sql`select id, title, goal, raised, status from pools where id = ${pi.metadata.pool_id}`;
    const [c] = await sql`select amount, refunded from contributions where pi_id = ${pi.id}`;
    return { ...base, pool: p ?? null, accepted: c?.amount ?? 0, refunded: c?.refunded ?? 0 };
  }

  const allowed = !!clientSecret && clientSecret === pi.client_secret;
  if (kind === "gift_card") {
    const [g] = await sql`select code, amount, to_name, status from gift_cards where pi_id = ${pi.id}`;
    return { ...base, gift: allowed && g?.status === "active" ? { code: g.code, amount: g.amount, toName: g.to_name } : null };
  }

  const [o] = await sql`select id, user_id, buyer, delivery, recipient, installer, status, pool_id, total_paid, gift_card_used from orders where pi_id = ${pi.id}`;
  if (!o) return { ...base, order: null };
  const mine = allowed || (!!viewer && viewer.uid === o.user_id);
  return { ...base, order: mine ? { ref: o.id, total: o.total_paid + o.gift_card_used, giftUsed: o.gift_card_used, phone: o.delivery.phone, email: o.buyer.email, installer: o.installer, recipient: o.recipient ? { name: o.recipient.name } : null, status: o.status } : { ref: o.id, status: o.status }, error: "error" in r ? r.error : undefined };
}
