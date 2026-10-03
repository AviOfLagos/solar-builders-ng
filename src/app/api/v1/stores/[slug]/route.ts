import { ok, fail, route } from "@/lib/server/api";
import { getStorePage } from "@/lib/server/social";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/v1/stores/[slug]">) => {
  const s = await getStorePage((await ctx.params).slug);
  return s ? ok(s) : fail("Store not found.", 404);
});
