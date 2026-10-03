import { ok, fail, route, currentUser } from "@/lib/server/api";
import { poolPage } from "@/lib/server/pools";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/v1/pools/[id]">) => {
  const p = await poolPage((await ctx.params).id, await currentUser());
  return p ? ok(p) : fail("This Go Solar Me page doesn't exist.", 404);
});
