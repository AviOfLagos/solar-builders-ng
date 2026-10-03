import { body, fail, ok, route, str, currentUser, limitIp } from "@/lib/server/api";
import { paymentSummary } from "@/lib/server/payments";
import { stripeConfigured } from "@/lib/server/stripe";

/** After the card step (web success page or app): completes the payment and says what it bought. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/payments/[id]">) => {
  const { id } = await ctx.params;
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(id)) return fail("Invalid payment.");
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  await limitIp(req, "payments", 60, 600);
  const r = await paymentSummary(id, str((await body<{ clientSecret: string }>(req)).clientSecret, 200), await currentUser());
  return r ? ok(r) : fail("Payment not found.", 404);
});
