import { body, fail, ok, oneOf, route, requireTeam } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { LEAD_STATUS } from "@/lib/server/admin";

/** Move a lead along: new → contacted → engaged → ready to buy → paid, or lost. */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/v1/admin/leads/[id]">) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const status = oneOf((await body(req)).status, LEAD_STATUS, "contacted");
  const sql = await db();
  const [l] = await sql`update leads set status = ${status}, contacted_at = coalesce(contacted_at, case when ${status} <> 'new' then now() end), updated_at = now()
    where id = ${(await ctx.params).id} returning id, status`;
  return l ? ok(l) : fail("Lead not found.", 404);
});
