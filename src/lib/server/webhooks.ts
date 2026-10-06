import "server-only";
import { createHmac } from "node:crypto";

/**
 * Tells the automation (n8n, or anything that takes a webhook) that something happened.
 * Set WEBHOOK_URL, and WEBHOOK_SECRET to sign each call: header `x-sb-signature` is the
 * hex HMAC-SHA256 of the exact request body. Never throws and never waits more than 5 seconds,
 * so a slow or missing receiver can't hurt a customer's request.
 */
export async function emit(event: string, data: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  const body = JSON.stringify({ event, at: new Date().toISOString(), data });
  const headers: Record<string, string> = { "content-type": "application/json", "x-sb-event": event };
  if (process.env.WEBHOOK_SECRET) headers["x-sb-signature"] = createHmac("sha256", process.env.WEBHOOK_SECRET).update(body).digest("hex");
  try {
    const r = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
    if (!r.ok) console.error(`[webhook] ${event} -> ${r.status}`);
  } catch (e) {
    console.error(`[webhook] ${event} failed`, (e as Error).message);
  }
}
