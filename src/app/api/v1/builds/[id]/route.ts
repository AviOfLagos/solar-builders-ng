import { ok, fail, route } from "@/lib/server/api";
import { getBuild } from "@/lib/server/social";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/v1/builds/[id]">) => {
  const b = await getBuild((await ctx.params).id, true);
  return b ? ok(b) : fail("This build link doesn't exist.", 404);
});
