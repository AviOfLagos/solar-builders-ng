import { ok, route } from "@/lib/server/api";
import { payOptions } from "@/lib/server/pay";

/** Which ways to pay are switched on: naira (Paystack: card, transfer, USSD) and international cards (Stripe). */
export const GET = route(async () => ok(payOptions()));
