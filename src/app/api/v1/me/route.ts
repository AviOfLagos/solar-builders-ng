import { db } from "@/lib/server/db";
import { ok, route, currentUser, isTeam } from "@/lib/server/api";
import { listCards, stripeConfigured } from "@/lib/server/stripe";

export const GET = route(async () => {
  const s = await currentUser();
  if (!s) return ok({ user: null, cards: [], store: null, lastDelivery: null, team: false });
  const sql = await db();
  const [u] = await sql`select id, email, name, phone, stripe_customer_id, google_sub, password_hash is not null as has_password from users where id = ${s.uid}`;
  const [store] = await sql`select slug, name, kind, commission_bps from stores where user_id = ${s.uid}`;
  const [last] = await sql`select delivery, recipient from orders where user_id = ${s.uid} and pool_id is null and status <> 'awaiting_payment' and recipient is null order by created_at desc limit 1`;
  const cards = u.stripe_customer_id && stripeConfigured() ? await listCards(u.stripe_customer_id).catch(() => []) : [];
  const d = last?.delivery;
  return ok({
    user: { id: u.id, email: u.email, name: u.name, phone: u.phone, google: !!u.google_sub, hasPassword: u.has_password },
    cards, store: store ?? null, team: await isTeam(s),
    lastDelivery: d ? { address: d.address, lga: d.lga, landmark: d.landmark, altPhone: d.altPhone } : null,
  });
});
