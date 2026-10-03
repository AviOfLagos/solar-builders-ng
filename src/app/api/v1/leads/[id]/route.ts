import { ok, fail, route, limitIp } from "@/lib/server/api";
import { leadCart } from "@/lib/server/leads";

/** Resume link: the saved cart only, no personal details. */
export const GET = route(async (req: Request, ctx: RouteContext<"/api/v1/leads/[id]">) => {
  await limitIp(req, "resume", 30, 600);
  const c = await leadCart((await ctx.params).id);
  return c ? ok(c) : fail("This link has expired.", 404);
});
