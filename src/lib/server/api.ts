import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

export async function body<T = Record<string, unknown>>(req: Request): Promise<Partial<T>> {
  return (await req.json().catch(() => ({}))) as Partial<T>;
}

export const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
export const int = (v: unknown) => Math.floor(Number(v) || 0);

/** Wraps a handler so unexpected errors return JSON instead of an HTML 500. */
export function route<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      console.error("[api]", e);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}

export async function requireUser(): Promise<Session | Response> {
  const s = await getSession();
  return s ?? fail("Sign in first.", 401);
}
