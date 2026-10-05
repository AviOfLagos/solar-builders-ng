import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql, PAID, naira } from "../lib/db";

export default defineTool({
  description: "Sales, paid orders, average order, new leads and visitors for the last N days, compared with the N days before.",
  inputSchema: z.object({ days: z.number().int().min(1).max(365).default(7) }),
  async execute({ days }) {
    const db = sql();
    const [o] = await db`select
        count(*) filter (where created_at >= now() - make_interval(days => ${days}))::int as orders,
        coalesce(sum(total_paid + gift_card_used) filter (where created_at >= now() - make_interval(days => ${days})), 0)::int as sales,
        count(*) filter (where created_at < now() - make_interval(days => ${days}))::int as prev_orders,
        coalesce(sum(total_paid + gift_card_used) filter (where created_at < now() - make_interval(days => ${days})), 0)::int as prev_sales
      from orders where status = any(${PAID}) and created_at >= now() - make_interval(days => ${days * 2})`;
    const [l] = await db`select count(*)::int as n from leads where created_at >= now() - make_interval(days => ${days})`;
    const [v] = await db`select count(distinct sid)::int as n from events where at >= now() - make_interval(days => ${days}) and sid <> ''`;
    return {
      days,
      sales: naira(o.sales), paidOrders: o.orders, averageOrder: naira(o.orders ? o.sales / o.orders : 0),
      previous: { sales: naira(o.prev_sales), paidOrders: o.prev_orders },
      newLeads: l.n, visitors: v.n,
    };
  },
});
