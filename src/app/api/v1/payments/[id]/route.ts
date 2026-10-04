import { body, fail, ok, route, str, currentUser, limitIp } from "@/lib/server/api";
import { paymentSummary } from "@/lib/server/payments";
import { isPaymentRef } from "@/lib/server/pay";

/**
 * After paying (web success page or app): completes the payment and says what it bought.
 * id is a Paystack reference (ps_…) or a Stripe PaymentIntent (pi_…, send its clientSecret).
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/payments/[id]">) => {
  const { id } = await ctx.params;
  if (!isPaymentRef(id)) return fail("Invalid payment.");
  await limitIp(req, "payments", 60, 600);
  const r = await paymentSummary(id, str((await body<{ clientSecret: string }>(req)).clientSecret, 200), await currentUser());
  return r ? ok(r) : fail("Payment not found.", 404);
});
