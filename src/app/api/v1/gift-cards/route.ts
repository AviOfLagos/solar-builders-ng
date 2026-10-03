import { after } from "next/server";
import { body, fail, ok, route, limitIp } from "@/lib/server/api";
import { stripeConfigured, ensureWebhook } from "@/lib/server/stripe";
import { startGiftCard } from "@/lib/server/orders";

export const POST = route(async (req: Request) => {
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  await limitIp(req, "giftcards", 10, 3600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await startGiftCard(await body(req)));
});
