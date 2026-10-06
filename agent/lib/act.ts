import { createHmac } from "node:crypto";

const SITE = () => process.env.SITE_URL || "https://solar.nexprove.com";
const key = () => process.env.AGENT_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

/** Asks the site to do something, signed so only this deployment's assistant can. `actor` is who approved it. */
export async function act<T = Record<string, unknown>>(action: string, actor: string, data: Record<string, unknown> = {}): Promise<T> {
  const raw = JSON.stringify({ ...data, action, actor });
  const ts = Date.now();
  const sig = createHmac("sha256", key()).update(`${ts}.${raw}`).digest("hex");
  const res = await fetch(`${SITE()}/api/v1/agent/act`, { method: "POST", headers: { "content-type": "application/json", "x-agent-ts": String(ts), "x-agent-sig": sig }, body: raw, signal: AbortSignal.timeout(25_000) });
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  // Return the reason instead of throwing, so the assistant can tell the person what to fix.
  if (!res.ok) return { ok: false, error: out.error ?? `Failed (${res.status})` } as T;
  return out;
}

/** The team member behind this turn, from the signed-in session. */
export const who = (ctx: { session: { auth: { current?: { principalId?: string } | null } } }) => ctx.session.auth.current?.principalId ?? "assistant";
