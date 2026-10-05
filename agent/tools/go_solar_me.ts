import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql, naira } from "../lib/db";

export default defineTool({
  description: "Go Solar Me fundraising pages and squad splits: title, owner, raised vs goal, supporters and deadline.",
  inputSchema: z.object({ status: z.enum(["open", "funded", "ended", "cancelled"]).optional(), limit: z.number().int().min(1).max(50).default(10) }),
  async execute({ status, limit }) {
    const rows = await sql()`select p.id, p.title, p.kind, p.goal, p.raised, p.status, p.deadline, u.name as owner,
        (select count(*)::int from contributions c where c.pool_id = p.id and c.status = 'paid') as supporters
      from pools p join users u on u.id = p.user_id where (${status ?? null}::text is null or p.status = ${status ?? null})
      order by p.created_at desc limit ${limit}`;
    return rows.map((p) => ({ ...p, goal: naira(p.goal), raised: naira(p.raised), percent: Math.round((p.raised / Math.max(1, p.goal)) * 100) }));
  },
});
