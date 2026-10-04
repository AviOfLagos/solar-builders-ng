import { body, fail, ok, route, str } from "@/lib/server/api";
import { abandonPayment } from "@/lib/server/orders";
import { isPaymentRef } from "@/lib/server/pay";

/** The payment failed or was cancelled: release the order (and any gift card hold) now. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/payments/[id]/cancel">) => {
  const { id } = await ctx.params;
  if (!isPaymentRef(id)) return fail("Invalid payment.");
  return ok(await abandonPayment(id, str((await body<{ clientSecret: string }>(req)).clientSecret, 200)));
});
