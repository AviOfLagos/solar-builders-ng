"use client";
/** Tiny JSON fetch helper for /api/v1. Throws with the server's message on failure. */
export type ApiError = Error & { fields?: Record<string, string>; status?: number; code?: string; data?: Record<string, unknown> };

export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("No connection. Check your internet and try again."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { fields: data.fields as Record<string, string> | undefined, status: res.status, code: data.code as string | undefined, data });
  return data as T;
}

function readJson<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function writeJson(key: string, v: unknown) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

const REF_KEY = "sb_ref";
const REF_DAYS = 30;

/** Remember which seller/installer sent this shopper, for 30 days (last click wins). */
export function setRef(slug: string) {
  writeJson(REF_KEY, { slug, exp: Date.now() + REF_DAYS * 864e5 });
}
export function getRef(): string | undefined {
  const v = readJson<{ slug: string; exp: number }>(REF_KEY);
  return v && v.exp > Date.now() ? v.slug : undefined;
}

/* ---------- leads: how we reach people who don't finish ---------- */

const LEAD_KEY = "sb_lead";
export const getLeadId = () => readJson<string>(LEAD_KEY) ?? undefined;
export const setLeadId = (id: string | null) => writeJson(LEAD_KEY, id);

export async function saveLead(d: { name?: string; phone?: string; email?: string; consent?: boolean; source: string; items: { id: string; qty: number }[] }) {
  const r = await api<{ id: string | null }>("/leads", { body: { ...d, id: getLeadId() } });
  setLeadId(r.id);
  return r.id;
}

/** Only an absolute path on this site. Blocks //evil.com and /\evil.com. */
export const safeNext = (n: string | null | undefined, fallback = "/account") => (n && /^\/(?![/\\])/.test(n) ? n : fallback);
