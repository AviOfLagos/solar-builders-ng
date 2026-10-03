import "server-only";
import Stripe from "stripe";
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
  const c = await stripe().customers.create({ email: u.email, name: u.name || undefined, metadata: { user_id: uid } });
  await sql`update users set stripe_customer_id = ${c.id} where id = ${uid}`;
  return c.id;
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

export async function ownsCard(customerId: string, pmId: string) {
  const pm = await stripe().paymentMethods.retrieve(pmId);
  return pm.customer === customerId ? pm : null;
}

/** Stripe's smallest charge is about US$0.50; keep every naira charge above this. */
export const MIN_CHARGE_NGN = 1000;
