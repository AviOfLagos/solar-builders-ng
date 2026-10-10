import { after } from "next/server";
import { body, fail, ok, route, currentUser, limitIp } from "@/lib/server/api";
import { ensureWebhook } from "@/lib/server/stripe";
import { anyProvider } from "@/lib/server/pay";
import { requirePaymentsOpen } from "@/lib/server/switch";
import { startCheckout } from "@/lib/server/orders";

/** Body: cart, delivery, optional giftCode / savedCardId, and provider "paystack" (naira, default) or "stripe" (cards from abroad). */
export const POST = route(async (req: Request) => {
  await requirePaymentsOpen();
  if (!anyProvider()) return fail("Payments are not switched on yet. Please WhatsApp us to order.", 503);
  await limitIp(req, "checkout", 20, 600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await startCheckout(await body(req), await currentUser(), new URL(req.url).origin));
});
