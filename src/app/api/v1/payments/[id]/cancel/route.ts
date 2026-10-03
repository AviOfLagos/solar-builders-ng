import { body, fail, ok, route, str } from "@/lib/server/api";
import { abandonPayment } from "@/lib/server/orders";

/** The card step failed or was abandoned: release the order (and any gift card hold) now. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/payments/[id]/cancel">) => {
  const { id } = await ctx.params;
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(id)) return fail("Invalid payment.");
  return ok(await abandonPayment(id, str((await body<{ clientSecret: string }>(req)).clientSecret, 200)));
});
