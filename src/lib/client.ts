"use client";
/** Tiny JSON fetch helper for /api/v1. Throws with the server's message on failure. */
export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: init.body ? { "content-type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { fields: data.fields as Record<string, string> | undefined, status: res.status });
  return data as T;
}

const REF_KEY = "sb_ref";
const REF_DAYS = 30;

/** Remember which seller/installer sent this shopper, for 30 days (last click wins). */
export function setRef(slug: string) {
  try { localStorage.setItem(REF_KEY, JSON.stringify({ slug, exp: Date.now() + REF_DAYS * 864e5 })); } catch {}
}
export function getRef(): string | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(REF_KEY) || "null");
    return v && v.exp > Date.now() ? v.slug : undefined;
  } catch { return undefined; }
}
