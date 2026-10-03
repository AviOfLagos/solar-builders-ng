import { db } from "@/lib/server/db";
import { ok, route, requireTeam } from "@/lib/server/api";

/** Team page data: leads to follow up, orders to fulfil, live pools, and today's money. */
export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const sql = await db();
  const leads = await sql`select id, name, phone, email, consent, source, items, total, contacted_at, created_at, updated_at from leads
    where order_id is null and updated_at < now() - interval '1 hour' and updated_at > now() - interval '30 days' order by updated_at desc limit 100`;
  const orders = await sql`select id, items, subtotal, total_paid, gift_card_used, commission, buyer, delivery, recipient, installer, status, status_at, pool_id, source, created_at
    from orders where status not in ('awaiting_payment', 'expired') order by created_at desc limit 100`;
  const pools = await sql`select p.id, p.kind, p.title, p.goal, p.raised, p.status, p.deadline, p.created_at, u.name as owner, u.email as owner_email
    from pools p join users u on u.id = p.user_id order by p.created_at desc limit 50`;
  const finance = await sql`select id, name, phone, email, employment, income_band, total, down_pct, months, status, created_at from finance_requests order by created_at desc limit 50`;
  const [money] = await sql`select
      coalesce(sum(amount) filter (where kind = 'payment'), 0)::int as paid_in,
      coalesce(sum(amount) filter (where kind = 'refund'), 0)::int as refunded,
      coalesce(sum(amount) filter (where kind = 'store_cover'), 0)::int as covered
    from ledger where at > now() - interval '30 days'`;
  return ok({ leads, orders, pools, finance, money });
});
