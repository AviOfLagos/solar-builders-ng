import { db } from "@/lib/server/db";
import { ok, requireUser, route } from "@/lib/server/api";
import { ORDER_STATUS, type OrderStatus } from "@/config/store";

export const GET = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sql = await db();
  const orders = await sql`select id, items, subtotal, total_paid, gift_card_used, status, status_at, recipient, delivery, installer, pool_id, created_at
    from orders where user_id = ${s.uid} and status not in ('awaiting_payment', 'expired') order by created_at desc limit 50`;
  const pools = await sql`select id, kind, title, goal, raised, status, deadline, created_at from pools where user_id = ${s.uid} order by created_at desc limit 50`;
  return ok({
    orders: orders.map((o) => ({ ...o, statusLabel: ORDER_STATUS[o.status as OrderStatus] ?? o.status, delivery: { lga: o.delivery.lga, address: o.delivery.address } })),
    pools,
  });
});
