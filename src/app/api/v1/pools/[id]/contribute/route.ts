import { body, fail, ok, route } from "@/lib/server/api";
import { stripeConfigured } from "@/lib/server/stripe";
import { createContribution } from "@/lib/server/commerce";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/pools/[id]/contribute">) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  const r = await createContribution((await ctx.params).id, await body(req));
  const { status, ...rest } = r;
  return "error" in r ? fail(String(r.error), status) : ok(rest);
});
