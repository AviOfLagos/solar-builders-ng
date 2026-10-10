import "server-only";
import { db } from "./db";
import { HttpError } from "./api";

/**
 * Master payment switch. Closed unless the team opens it (admin dashboard).
 * PAYMENTS_ENABLED=false in the environment forces it closed whatever the dashboard says.
 * Payments already started still finish and get recorded (webhooks are not blocked).
 */
const KEY = "payments_open";
let cache: { v: boolean; at: number } | null = null;

export async function paymentsOpen(): Promise<boolean> {
  if (process.env.PAYMENTS_ENABLED === "false") return false;
  if (cache && Date.now() - cache.at < 5000) return cache.v;
  const sql = await db();
  const [r] = await sql`select value from settings where key = ${KEY}`;
  const v = r?.value === "on";
  cache = { v, at: Date.now() };
  return v;
}

export async function setPaymentsOpen(on: boolean) {
  const sql = await db();
  await sql`insert into settings (key, value) values (${KEY}, ${on ? "on" : "off"}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  cache = { v: on, at: Date.now() };
}

/** Call at the top of anything that takes money. */
export async function requirePaymentsOpen() {
  if (!(await paymentsOpen())) throw new HttpError(503, "We're not taking online payments yet. Message us on WhatsApp and we'll help you order.");
}
