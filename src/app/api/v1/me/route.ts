import { db } from "@/lib/server/db";
import { ok, route } from "@/lib/server/api";
import { getSession } from "@/lib/server/session";
import { listCards, stripeConfigured } from "@/lib/server/stripe";

export const GET = route(async () => {
  const s = await getSession();
  if (!s) return ok({ user: null, cards: [], store: null });
  const sql = await db();
  const [u] = await sql`select id, email, name, phone, stripe_customer_id from users where id = ${s.uid}`;
  if (!u) return ok({ user: null, cards: [], store: null });
  const [store] = await sql`select slug, name, kind, commission_bps from stores where user_id = ${s.uid}`;
  const cards = u.stripe_customer_id && stripeConfigured() ? await listCards(u.stripe_customer_id).catch(() => []) : [];
  return ok({ user: { id: u.id, email: u.email, name: u.name, phone: u.phone }, cards, store: store ?? null });
});
