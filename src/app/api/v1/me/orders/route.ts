import { db } from "@/lib/server/db";
import { ok, requireUser, route } from "@/lib/server/api";

export const GET = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sql = await db();
  const orders = await sql`select id, items, subtotal, total_paid, gift_card_used, status, recipient, delivery, installer, created_at from orders where user_id = ${s.uid} and status <> 'awaiting_payment' order by created_at desc limit 50`;
  const pools = await sql`select id, title, goal, raised, status, created_at from pools where user_id = ${s.uid} order by created_at desc`;
  return ok({ orders, pools });
});
