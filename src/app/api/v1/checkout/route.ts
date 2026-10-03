import { after } from "next/server";
import { body, fail, ok, route, currentUser, limitIp } from "@/lib/server/api";
import { stripeConfigured, ensureWebhook } from "@/lib/server/stripe";
import { startCheckout } from "@/lib/server/orders";

export const POST = route(async (req: Request) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet. Please WhatsApp us to order.", 503);
  await limitIp(req, "checkout", 20, 600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await startCheckout(await body(req), await currentUser(), new URL(req.url).origin));
});
