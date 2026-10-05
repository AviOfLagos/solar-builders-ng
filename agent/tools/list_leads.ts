import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql, naira } from "../lib/db";

export default defineTool({
  description: "People who left a phone or email but haven't paid, newest first. Filter by status (new, contacted, engaged, ready_to_buy, paid, lost) or source (checkout, cart, calculator, finance, pool, brand…).",
  inputSchema: z.object({ status: z.string().max(20).optional(), source: z.string().max(20).optional(), limit: z.number().int().min(1).max(50).default(15) }),
  async execute({ status, source, limit }) {
    const rows = await sql()`select id, name, phone, email, source, status, total, note, consent, updated_at from leads
      where order_id is null and (${status ?? null}::text is null or status = ${status ?? null}) and (${source ?? null}::text is null or source = ${source ?? null})
      order by updated_at desc limit ${limit}`;
    return rows.map((l) => ({ ...l, total: naira(l.total) }));
  },
});
