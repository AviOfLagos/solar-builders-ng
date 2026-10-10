import { after } from "next/server";
import { body, fail, ok, route, limitIp } from "@/lib/server/api";
import { ensureWebhook } from "@/lib/server/stripe";
import { anyProvider } from "@/lib/server/pay";
import { requirePaymentsOpen } from "@/lib/server/switch";
import { startGiftCard } from "@/lib/server/orders";

export const POST = route(async (req: Request) => {
  await requirePaymentsOpen();
  if (!anyProvider()) return fail("Payments are not switched on yet.", 503);
  await limitIp(req, "giftcards", 10, 3600);
  after(() => ensureWebhook().catch((e) => console.error("[webhook setup]", e)));
  return ok(await startGiftCard(await body(req), new URL(req.url).origin));
});
