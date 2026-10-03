import { ok, fail, route } from "@/lib/server/api";
import { getPool } from "@/lib/server/social";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/v1/pools/[id]">) => {
  const p = await getPool((await ctx.params).id);
  return p ? ok(p) : fail("This funding page doesn't exist.", 404);
});
