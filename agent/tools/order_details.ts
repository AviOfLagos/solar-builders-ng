import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql, naira } from "../lib/db";
import { productName } from "../lib/catalog";

export default defineTool({
  description: "Full details of one order by id, including who to deliver to, address, phone and items. Only use when the team asks about this order.",
  inputSchema: z.object({ id: z.string().min(3).max(40) }),
  async execute({ id }) {
    const [o] = await sql()`select * from orders where upper(id) = upper(${id})`;
    if (!o) return { found: false };
    return {
      found: true, id: o.id, status: o.status, placed: o.created_at, statusSince: o.status_at,
      paid: naira(o.total_paid), giftCard: naira(o.gift_card_used), commission: naira(o.commission),
      buyer: o.buyer, deliverTo: o.recipient ?? { name: o.buyer.name, phone: o.buyer.phone }, delivery: o.delivery,
      installer: o.installer, goSolarMePage: o.pool_id, source: o.source,
      items: (o.items as { id: string; qty: number }[]).map((i) => `${i.qty} × ${productName(i.id)}`),
    };
  },
});
