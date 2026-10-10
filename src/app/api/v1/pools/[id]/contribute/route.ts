import { after } from "next/server";
import { body, fail, ok, route, currentUser, limitIp } from "@/lib/server/api";
import { ensureWebhook } from "@/lib/server/stripe";
import { anyProvider } from "@/lib/server/pay";
import { requirePaymentsOpen } from "@/lib/server/switch";
import { createContribution } from "@/lib/server/pools";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/pools/[id]/contribute">) => {
  await requirePaymentsOpen();
  if (!anyProvider()) return fail("Payments are not switched on yet.", 503);
  await limitIp(req, "contribute", 20, 3600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await createContribution((await ctx.params).id, await body(req), await currentUser(), new URL(req.url).origin));
});
