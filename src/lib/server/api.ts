import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";
import { db } from "./db";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** JSON body as a plain object. Anything else (null, arrays, bad JSON, huge bodies) becomes {}. */
export async function body<T = Record<string, unknown>>(req: Request): Promise<Partial<T>> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 100_000) return {};
  const v = await req.json().catch(() => null);
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Partial<T>) : {};
}

/** A trimmed string with control characters removed. Non-strings (objects, arrays) become "". */
export const str = (v: unknown, max = 200) =>
  (typeof v === "string" || typeof v === "number" ? String(v) : "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

/** A whole number, or 0 when it isn't one. */
export const int = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.trim()) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** Only a real `true` counts. "false", 1 and "yes" do not. */
export const bool = (v: unknown) => v === true;

export const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  (list as readonly unknown[]).includes(v) ? (v as T) : fallback;

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/** Wraps a handler so unexpected errors return JSON instead of an HTML 500. */
export function route<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status, e.extra);
      console.error("[api]", e);
      return fail("Something went wrong on our side. Please try again.", 500);
    }
  };
}

export async function requireUser(): Promise<Session | Response> {
  const s = await getSession();
  if (!s) return fail("Sign in first.", 401);
  const sql = await db();
  const [u] = await sql`select 1 from users where id = ${s.uid}`;
  return u ? s : fail("Your session has ended. Sign in again.", 401);
}

/**
 * Team members: emails listed in TEAM_EMAILS, signed in with Google at least once, so the email
 * is verified. A password account with the same email is not enough.
 */
export async function isTeam(s: Session | null) {
  if (!s) return false;
  const team = (process.env.TEAM_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!team.length) return false;
  const sql = await db();
  const [u] = await sql`select email, google_sub from users where id = ${s.uid}`;
  return !!u?.google_sub && team.includes(String(u.email).toLowerCase());
}

export async function requireTeam(): Promise<Session | Response> {
  const s = await getSession();
  return (await isTeam(s)) ? s! : fail("Team only.", 403);
}

/** The session, but only if the account still exists. */
export async function currentUser(): Promise<Session | null> {
  const s = await getSession();
  if (!s) return null;
  const sql = await db();
  const [u] = await sql`select 1 from users where id = ${s.uid}`;
  return u ? s : null;
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim().slice(0, 64);
}

/**
 * Fixed-window rate limit kept in Postgres, so it holds across serverless instances.
 * Throws a 429 when `key` has been used more than `max` times in `windowSec` seconds.
 */
export async function limit(key: string, max: number, windowSec: number) {
  const sql = await db();
  const [r] = await sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then now() else rate_limits.window_start end
    returning count`;
  if (r.count > max) throw new HttpError(429, "Too many tries. Please wait a few minutes and try again.");
}

/** Per-IP limit for an endpoint. */
export const limitIp = (req: Request, name: string, max: number, windowSec: number) => limit(`${name}:${clientIp(req)}`, max, windowSec);
