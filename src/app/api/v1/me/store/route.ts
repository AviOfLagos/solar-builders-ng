import { db } from "@/lib/server/db";
import { ok, requireUser, route } from "@/lib/server/api";

/** Seller dashboard: store details, earnings and recent referred orders. */
export const GET = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sql = await db();
  const [store] = await sql`select id, slug, name, bio, kind, commission_bps, whatsapp, created_at from stores where user_id = ${s.uid}`;
  if (!store) return ok({ store: null });
  const [stats] = await sql`select count(*)::int as orders, coalesce(sum(subtotal),0)::int as sales, coalesce(sum(commission),0)::int as earned from orders where store_id = ${store.id} and status <> 'awaiting_payment'`;
  const recent = await sql`select id, subtotal, commission, status, created_at from orders where store_id = ${store.id} and status <> 'awaiting_payment' order by created_at desc limit 20`;
  const builds = await sql`select id, title, items, views, created_at from builds where store_id = ${store.id} order by created_at desc limit 20`;
  return ok({ store, stats, recent, builds });
});
