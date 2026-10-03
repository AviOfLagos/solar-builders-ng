import { after } from "next/server";
import { body, fail, ok, route, currentUser, limitIp } from "@/lib/server/api";
import { stripeConfigured, ensureWebhook } from "@/lib/server/stripe";
import { createContribution } from "@/lib/server/pools";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/pools/[id]/contribute">) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  await limitIp(req, "contribute", 20, 3600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await createContribution((await ctx.params).id, await body(req), await currentUser()));
});
