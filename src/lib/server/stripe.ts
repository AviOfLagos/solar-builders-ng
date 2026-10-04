import "server-only";
import Stripe from "stripe";
import { STORE } from "@/config/store";
import { db } from "./db";

let client: Stripe | null = null;

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Solar Builders NG" } });
  return client;
}

/** One Stripe customer per account, created on first need. Never looked up by email. */
export async function customerFor(uid: string) {
  const sql = await db();
  const [u] = await sql`select id, email, name, stripe_customer_id from users where id = ${uid}`;
  if (!u) throw new Error("User not found");
  if (u.stripe_customer_id) return u.stripe_customer_id as string;
  // The idempotency key makes two simultaneous calls get the same customer back.
  const c = await stripe().customers.create({ email: u.email, name: u.name || undefined, metadata: { user_id: uid } }, { idempotencyKey: `customer-${uid}` });
  const [set] = await sql`update users set stripe_customer_id = ${c.id} where id = ${uid} and stripe_customer_id is null returning stripe_customer_id`;
  if (set) return c.id;
  const [now] = await sql`select stripe_customer_id from users where id = ${uid}`;
  return now.stripe_customer_id as string;
}

export type SavedCard = { id: string; brand: string; last4: string; expMonth: number; expYear: number; nickname: string; created: number };

/** Cards for a customer, newest first. */
export async function listCards(customerId: string): Promise<SavedCard[]> {
  const res = await stripe().customers.listPaymentMethods(customerId, { type: "card", limit: 50 });
  return res.data
    .filter((pm) => pm.card)
    .map((pm) => ({
      id: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      expMonth: pm.card!.exp_month,
      expYear: pm.card!.exp_year,
      nickname: pm.metadata?.nickname || `${pm.card!.brand.toUpperCase()} •••• ${pm.card!.last4}`,
      created: pm.created,
    }))
    .sort((a, b) => b.created - a.created);
}

/** The card, if it belongs to this customer. Unknown ids return null instead of throwing. */
export async function ownsCard(customerId: string, pmId: string) {
  if (!/^pm_[A-Za-z0-9]{6,}$/.test(pmId)) return null;
  const pm = await stripe().paymentMethods.retrieve(pmId).catch(() => null);
  return pm && pm.customer === customerId ? pm : null;
}

/* ---------- webhook ---------- */

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "payment_intent.succeeded",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.dispute.created",
];

/** The signing secret: from the environment if set, else the one we stored when we registered the endpoint. */
export async function webhookSecret() {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;
  const sql = await db();
  const [r] = await sql`select value from settings where key = 'stripe_webhook_secret'`;
  return (r?.value as string | undefined) ?? null;
}

/**
 * Registers our webhook with Stripe the first time it is needed, and keeps its signing secret
 * in the database. No keys are copied by hand. Safe to call often: it does nothing once done.
 */
export async function ensureWebhook() {
  if (!stripeConfigured() || process.env.STRIPE_WEBHOOK_SECRET) return;
  if (!/^https:\/\/(?!localhost)/.test(STORE.url)) return;
  const sql = await db();
  const [have] = await sql`select 1 from settings where key = 'stripe_webhook_secret'`;
  if (have) return;
  // One instance at a time; a stale lock (crashed attempt) is retaken after 5 minutes.
  const [lock] = await sql`
    insert into settings (key, value) values ('stripe_webhook_lock', 'x')
    on conflict (key) do update set value = 'x', updated_at = now() where settings.updated_at < now() - interval '5 minutes'
    returning key`;
  if (!lock) return;
  const url = `${STORE.url.replace(/\/$/, "")}/api/stripe/webhook`;
  const existing = await stripe().webhookEndpoints.list({ limit: 100 });
  // An endpoint for our URL without a stored secret can't be verified; replace it.
  for (const e of existing.data) if (e.url === url) await stripe().webhookEndpoints.del(e.id);
  const ep = await stripe().webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: "Solar Builders NG (registered by the app)" });
  await sql`insert into settings (key, value) values ('stripe_webhook_secret', ${ep.secret!}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  console.log("[stripe] webhook registered", url);
}

/** Refund all or part of a payment back to the card it came from. */
export async function refund(piId: string, amountNgn: number | undefined, reason: string) {
  return stripe().refunds.create(
    { payment_intent: piId, ...(amountNgn ? { amount: amountNgn * 100 } : {}), reason: "requested_by_customer", metadata: { note: reason.slice(0, 200) } },
    { idempotencyKey: `refund-${piId}-${amountNgn ?? "all"}-${reason.slice(0, 40)}` },
  );
}
