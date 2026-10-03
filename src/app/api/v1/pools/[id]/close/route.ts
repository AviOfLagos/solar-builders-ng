import { body, ok, requireUser, route } from "@/lib/server/api";
import { closePool } from "@/lib/server/pools";

/** Owner only: extend the deadline once, switch to a kit the money covers, or cancel and refund. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/pools/[id]/close">) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  return ok(await closePool(s, (await ctx.params).id, await body(req)));
});
