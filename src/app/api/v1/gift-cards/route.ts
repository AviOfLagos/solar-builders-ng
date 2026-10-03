import { body, fail, ok, route } from "@/lib/server/api";
import { stripeConfigured } from "@/lib/server/stripe";
import { startGiftCard } from "@/lib/server/commerce";

export const POST = route(async (req: Request) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  const r = await startGiftCard(await body(req));
  const { status, ...rest } = r;
  return "error" in r ? fail(String(r.error), status, rest) : ok(rest);
});
