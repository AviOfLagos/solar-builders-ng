import { body, fail, ok, route } from "@/lib/server/api";
import { getSession } from "@/lib/server/session";
import { stripeConfigured } from "@/lib/server/stripe";
import { startCheckout, type CheckoutInput } from "@/lib/server/commerce";

export const POST = route(async (req: Request) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet. Please WhatsApp us to order.", 503);
  const b = await body<CheckoutInput>(req);
  const r = await startCheckout(b, await getSession(), new URL(req.url).origin);
  const { status, ...rest } = r;
  return "error" in r ? fail(String(r.error), status, rest) : ok(rest);
});
