import { ok, requireUser, route } from "@/lib/server/api";
import { db } from "@/lib/server/db";

/** Stop pushes to this phone (call on sign-out). */
export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/v1/me/devices/[token]">) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sql = await db();
  await sql`delete from devices where token = ${decodeURIComponent((await ctx.params).token)} and user_id = ${s.uid}`;
  return ok({ ok: true });
});
