import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Solar Builders NG" } });
  return client;
}

export async function findOrCreateCustomer(email: string, name?: string) {
  const s = stripe();
  const existing = await s.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return s.customers.create({ email, name, metadata: { source: "solar-builders-ng" } });
}

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  nickname: string;
  created: number;
};

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
