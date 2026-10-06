import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ensureWebhook, stripeConfigured } from "@/lib/server/stripe";
import { anyProvider } from "@/lib/server/pay";
import { sweepStaleOrders } from "@/lib/server/orders";
import { sweepPools } from "@/lib/server/pools";
import { weeklyDigest } from "@/lib/server/admin";
import { notifyOwner } from "@/lib/server/mail";

/** Daily housekeeping, called by Vercel Cron with the CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { console.error(`[cron] ${name}`, e); out[name] = `error: ${(e as Error).message}`; }
  };
  if (stripeConfigured()) await step("webhook", ensureWebhook);
  if (anyProvider()) {
    await step("orders", () => sweepStaleOrders());
    await step("pools", sweepPools);
  }
  await step("rateLimits", async () => {
    const sql = await db();
    const gone = await sql`delete from rate_limits where window_start < now() - interval '1 day'`;
    return gone.count;
  });
  await step("leads", async () => {
    // Privacy page promise: unfinished carts are deleted after 90 days.
    const sql = await db();
    const gone = await sql`delete from leads where order_id is null and updated_at < now() - interval '90 days'`;
    return gone.count;
  });
  await step("events", async () => {
    const sql = await db();
    const gone = await sql`delete from events where at < now() - interval '180 days'`;
    return gone.count;
  });
  // Mondays: last week's numbers to the owner (email, and Slack/WhatsApp if set up).
  if (new Date().getUTCDay() === 1) await step("digest", async () => { const t = await weeklyDigest(); if (t) await notifyOwner(t); return !!t; });
  return NextResponse.json(out);
}
