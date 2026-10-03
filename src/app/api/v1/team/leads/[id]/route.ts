import { db } from "@/lib/server/db";
import { fail, ok, route, requireTeam } from "@/lib/server/api";

/** Mark a lead as contacted. */
export const PATCH = route(async (_req: Request, ctx: RouteContext<"/api/v1/team/leads/[id]">) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const sql = await db();
  const [l] = await sql`update leads set contacted_at = now() where id = ${(await ctx.params).id} returning id`;
  return l ? ok({ ok: true }) : fail("Lead not found.", 404);
});
