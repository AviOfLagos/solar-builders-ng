import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql, naira } from "../lib/db";
import { productName } from "../lib/catalog";

export default defineTool({
  description: "List recent paid orders, optionally by status (pending, confirmed, out_for_delivery, delivered, installed, refunded, cancelled), or only the late ones (pending over 24h, not delivered in 48h).",
  inputSchema: z.object({
    status: z.enum(["pending", "confirmed", "out_for_delivery", "delivered", "installed", "refunded", "cancelled"]).optional(),
    lateOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute({ status, lateOnly, limit }) {
    const db = sql();
    const rows = await db`select id, status, status_at, created_at, items, total_paid, gift_card_used, buyer->>'name' as buyer, coalesce(recipient->>'name', buyer->>'name') as deliver_to, delivery->>'lga' as lga, installer
      from orders where status not in ('awaiting_payment', 'expired')
        and (${status ?? null}::text is null or status = ${status ?? null})
        and (${!!lateOnly} = false or (status = 'pending' and status_at < now() - interval '24 hours') or (status in ('confirmed', 'out_for_delivery') and status_at < now() - interval '48 hours'))
      order by created_at desc limit ${limit}`;
    return rows.map((o) => ({
      id: o.id, status: o.status, since: o.status_at, placed: o.created_at, amount: naira(o.total_paid + o.gift_card_used),
      buyer: o.buyer, deliverTo: o.deliver_to, lga: o.lga, installer: o.installer,
      items: (o.items as { id: string; qty: number }[]).map((i) => `${i.qty} × ${productName(i.id)}`),
    }));
  },
});
