import "server-only";
import { db } from "./db";

export type Push = { title: string; body: string; data?: Record<string, string> };

/**
 * Sends a push to every phone a user has signed in on (Expo push service). Never throws:
 * a missed push must not break a payment. Tokens Expo says are dead are removed.
 */
export async function pushTo(userIds: (string | null | undefined)[], m: Push) {
  try {
    const ids = [...new Set(userIds.filter(Boolean) as string[])];
    if (!ids.length) return;
    const sql = await db();
    const rows = await sql`select token from devices where user_id = any(${ids})`;
    if (!rows.length) return;
    const tokens = rows.map((r) => r.token as string);
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify(batch.map((to) => ({ to, title: m.title, body: m.body, data: m.data ?? {}, sound: "default" }))),
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      const dead = (json?.data ?? []).map((t, j) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? batch[j] : null)).filter(Boolean) as string[];
      if (dead.length) await sql`delete from devices where token = any(${dead})`;
    }
  } catch (e) {
    console.error("[push]", e);
  }
}

export const isPushToken = (t: string) => /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,}\]$/.test(t);
