import "server-only";
import type Stripe from "stripe";
import { STORE } from "@/config/store";
import { db, id } from "./db";
import { HttpError } from "./api";
import { stripe, stripeConfigured, listCards, refund as refundStripe } from "./stripe";
import {
  paystackConfigured, isPaystackRef, verifyPaystack, refundPaystack, paystackMeta, initializePaystack, newPaystackRef,
  chargePaystackAuthorization, type PaystackTx, type PaystackAuthorization, type PaystackChannel,
} from "./paystack";

/** Paystack for naira (cards, bank transfer, USSD); Stripe for cards from outside Nigeria. */
export type Provider = "paystack" | "stripe";

/** Smallest card charge we make, whichever provider. Gift card splits keep any card part above it. */
export const MIN_CHARGE_NGN = 1000;

/** What the web and the app can offer right now. */
export const payOptions = () => ({ naira: paystackConfigured(), intl: stripeConfigured(), minCharge: MIN_CHARGE_NGN });

/** The provider asked for if it is switched on; otherwise naira first. */
export function pickProvider(asked: unknown): Provider {
  if (asked === "stripe" && stripeConfigured()) return "stripe";
  if (asked === "paystack" && paystackConfigured()) return "paystack";
  if (paystackConfigured()) return "paystack";
  if (stripeConfigured()) return "stripe";
  throw new HttpError(503, "Payments are not switched on yet. Please WhatsApp us to order.");
}

export const anyProvider = () => paystackConfigured() || stripeConfigured();
export const providerOf = (ref: string): Provider => (isPaystackRef(ref) ? "paystack" : "stripe");
export const isPaymentRef = (ref: string) => isPaystackRef(ref) || /^pi_[A-Za-z0-9]{8,}$/.test(ref);

/** One shape for a payment, whichever provider took it. Amounts in naira. */
export type Paid = {
  provider: Provider;
  ref: string;
  status: "succeeded" | "processing" | "pending" | "failed" | "canceled";
  amount: number;
  metadata: Record<string, string>;
  email: string;
  /** Stripe only: the browser secret that unlocks details on the success page. */
  clientSecret?: string | null;
  stripe?: Stripe.PaymentIntent;
  /** Paystack only: the card used, which can be saved if the buyer asked. */
  authorization?: PaystackAuthorization;
  /** Paystack saved-card charge only: the bank wants the buyer to approve it on this page. */
  authorizationUrl?: string;
};

export function fromStripe(pi: Stripe.PaymentIntent): Paid {
  const status = pi.status === "succeeded" ? "succeeded" : pi.status === "processing" ? "processing" : pi.status === "canceled" ? "canceled" : pi.status === "requires_payment_method" && pi.last_payment_error ? "failed" : "pending";
  return { provider: "stripe", ref: pi.id, status, amount: (pi.status === "succeeded" ? pi.amount_received : pi.amount) / 100, metadata: pi.metadata || {}, email: pi.receipt_email || "", clientSecret: pi.client_secret, stripe: pi };
}

export function fromPaystack(tx: PaystackTx): Paid {
  const s = tx.status;
  const status = s === "success" ? "succeeded" : s === "failed" || s === "reversed" ? "failed" : s === "abandoned" ? "canceled" : s === "ongoing" || s === "processing" || s === "queued" ? "processing" : "pending";
  return {
    provider: "paystack", ref: tx.reference, status, amount: tx.amount / 100, metadata: paystackMeta(tx), email: tx.customer?.email || "",
    authorization: tx.authorization, authorizationUrl: tx.paused ? tx.authorization_url : undefined,
  };
}

/** Fetches the payment fresh from its provider. Never trusts what a browser or webhook body says. */
export async function fetchPayment(ref: string): Promise<Paid | null> {
  if (isPaystackRef(ref)) {
    if (!paystackConfigured()) return null;
    const tx = await verifyPaystack(ref).catch((e: Error & { httpStatus?: number }) => (e.httpStatus === 400 || e.httpStatus === 404 ? null : Promise.reject(e)));
    return tx ? fromPaystack(tx) : null;
  }
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(ref) || !stripeConfigured()) return null;
  const pi = await stripe().paymentIntents.retrieve(ref).catch(() => null);
  return pi ? fromStripe(pi) : null;
}

/** Refund all or part of a payment to the card or account it came from. */
export async function refundPayment(ref: string, amountNgn: number | undefined, reason: string) {
  if (isPaystackRef(ref)) return refundPaystack(ref, amountNgn, reason);
  return refundStripe(ref, amountNgn, reason);
}

/** Only our own site (or a local dev server) as the place Paystack sends the buyer back to. */
function baseUrl(origin: string | undefined) {
  return origin && /^https?:\/\/[a-z0-9.-]+(:\d{2,5})?$/i.test(origin) ? origin : STORE.url.replace(/\/$/, "");
}

/**
 * Starts a Paystack hosted payment. The buyer comes back to returnPath (with ?reference=…) when done,
 * or to cancelPath if they cancel on Paystack's page.
 */
export async function startPaystack(o: {
  email: string; amountNgn: number; metadata: Record<string, string>; origin?: string;
  returnPath?: string; cancelPath?: string; channels?: PaystackChannel[]; reference?: string;
}) {
  const base = baseUrl(o.origin);
  const reference = o.reference ?? newPaystackRef();
  const cancelPath = (o.cancelPath ?? "/checkout/success?reference={ref}").replace("{ref}", reference);
  try {
    const init = await initializePaystack({
      email: o.email, amountNgn: o.amountNgn, reference, channels: o.channels,
      callbackUrl: base + (o.returnPath ?? "/checkout/success"),
      metadata: { ...o.metadata, cancel_action: base + cancelPath },
    });
    return { ref: reference, authorizationUrl: init.authorization_url, accessCode: init.access_code };
  } catch (e) {
    console.error("[paystack] initialize", e);
    throw new HttpError(502, "We couldn't open the payment page. Try again in a moment.");
  }
}

/* ---------- saved cards ---------- */

export type Card = { id: string; provider: Provider; brand: string; last4: string; expMonth: number; expYear: number; nickname: string; bank?: string };

const expired = (m: number, y: number) => { const now = new Date(); return y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1); };

/** Naira cards (Paystack) first, then international cards (Stripe). Expired cards are left out. */
export async function savedCards(uid: string): Promise<Card[]> {
  const sql = await db();
  const [u] = await sql`select stripe_customer_id from users where id = ${uid}`;
  const ps = paystackConfigured()
    ? await sql`select id, brand, last4, exp_month, exp_year, bank, nickname from paystack_cards where user_id = ${uid} order by created_at desc`
    : [];
  const st = u?.stripe_customer_id && stripeConfigured() ? await listCards(u.stripe_customer_id).catch(() => []) : [];
  return [
    ...ps.filter((c) => !expired(c.exp_month, c.exp_year)).map((c) => ({
      id: c.id as string, provider: "paystack" as const, brand: c.brand as string, last4: c.last4 as string, expMonth: c.exp_month as number, expYear: c.exp_year as number,
      nickname: (c.nickname as string) || `${String(c.brand).toUpperCase()} •••• ${c.last4}`, bank: c.bank as string,
    })),
    ...st.map(({ created: _created, ...c }) => ({ ...c, provider: "stripe" as const })),
  ];
}

export const isPaystackCardId = (cid: string) => /^pc_[a-z0-9]{16}$/.test(cid);

/** Keeps the card from a Paystack payment, if it is a reusable card. Paying again with the same card updates it. */
export async function savePaystackCard(p: Paid, uid: string, nickname = "") {
  const a = p.authorization;
  if (!a || !a.reusable || a.channel !== "card" || !a.authorization_code || !p.email) return null;
  const sql = await db();
  const signature = a.signature || `${a.brand}-${a.last4}-${a.exp_month}-${a.exp_year}-${a.bank}`;
  const [c] = await sql`
    insert into paystack_cards ${sql({
      id: "pc_" + id(), user_id: uid, authorization_code: a.authorization_code, signature, email: p.email,
      brand: (a.brand || a.card_type || "card").trim().toLowerCase(), last4: a.last4 || "", exp_month: Number(a.exp_month) || 0, exp_year: Number(a.exp_year) || 0,
      bank: a.bank || "", nickname: nickname.slice(0, 40),
    })}
    on conflict (user_id, signature) do update set
      authorization_code = excluded.authorization_code, email = excluded.email, exp_month = excluded.exp_month, exp_year = excluded.exp_year,
      nickname = case when excluded.nickname <> '' then excluded.nickname else paystack_cards.nickname end
    returning id`;
  return c?.id as string | undefined;
}

export async function paystackCard(uid: string, cid: string) {
  if (!isPaystackCardId(cid)) return null;
  const sql = await db();
  const [c] = await sql`select id, authorization_code, email from paystack_cards where id = ${cid} and user_id = ${uid}`;
  return c ? { id: c.id as string, authorizationCode: c.authorization_code as string, email: c.email as string } : null;
}

/** Charges a saved naira card. A decline comes back as status "failed", not an error. */
export async function chargePaystackCard(card: { authorizationCode: string; email: string }, amountNgn: number, reference: string, metadata: Record<string, string>) {
  try {
    return fromPaystack(await chargePaystackAuthorization({ authorizationCode: card.authorizationCode, email: card.email, amountNgn, reference, metadata }));
  } catch (e) {
    const err = e as Error & { httpStatus?: number };
    // Paystack answers a decline with a 4xx; anything else is worth a retry later.
    if (err.httpStatus && err.httpStatus < 500) return { provider: "paystack", ref: reference, status: "failed", amount: amountNgn, metadata, email: card.email, declineMessage: err.message } as Paid & { declineMessage?: string };
    throw e;
  }
}
