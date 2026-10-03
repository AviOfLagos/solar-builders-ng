import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const SESSION = "sb_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s || "dev-only-secret-change-me-dev-only-secret");
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function checkPassword(pw: string, stored: string) {
  const [, saltHex, keyHex] = stored.split("$");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  const want = Buffer.from(keyHex, "hex");
  return key.length === want.length && timingSafeEqual(key, want);
}

export type Session = { uid: string; email: string; name: string };

/** Signs a session token. Web gets it as an httpOnly cookie; the mobile app keeps it and sends it as a Bearer token. */
export async function createSession(s: Session) {
  const token = await new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setExpirationTime("60d").sign(secret());
  (await cookies()).set(SESSION, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return token;
}

export async function getSession(): Promise<Session | null> {
  const auth = (await headers()).get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : (await cookies()).get(SESSION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.uid) return null;
    return { uid: String(payload.uid), email: String(payload.email), name: String(payload.name || "") };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(SESSION);
}
