import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ensureWebhook, stripeConfigured } from "@/lib/server/stripe";
import { sweepStaleOrders } from "@/lib/server/orders";
import { sweepPools } from "@/lib/server/pools";

/** Daily housekeeping, called by Vercel Cron with the CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { console.error(`[cron] ${name}`, e); out[name] = `error: ${(e as Error).message}`; }
  };
  if (stripeConfigured()) {
    await step("webhook", ensureWebhook);
    await step("orders", () => sweepStaleOrders());
    await step("pools", sweepPools);
  }
  await step("rateLimits", async () => (await (await db())`delete from rate_limits where window_start < now() - interval '1 day'`).count);
  return NextResponse.json(out);
}
