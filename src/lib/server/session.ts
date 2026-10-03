import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const SESSION = "sb_session";
const OTP = "sb_otp";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s || "dev-only-secret-change-me-dev-only-secret");
}

const hashCode = (email: string, code: string) =>
  createHmac("sha256", secret()).update(`${email.toLowerCase()}:${code}`).digest("hex");

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function issueOtp(email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = await new SignJWT({ email: email.toLowerCase(), h: hashCode(email, code), tries: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(secret());
  (await cookies()).set(OTP, token, { ...cookieOpts, maxAge: 600 });
  return code;
}

export async function verifyOtp(email: string, code: string) {
  const jar = await cookies();
  const token = jar.get(OTP)?.value;
  if (!token) return { ok: false as const, error: "Your code expired. Request a new one." };
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.email !== email.toLowerCase()) return { ok: false as const, error: "Use the email the code was sent to." };
    const tries = Number(payload.tries || 0);
    if (tries >= 5) return { ok: false as const, error: "Too many attempts. Request a new code." };
    const a = Buffer.from(String(payload.h)), b = Buffer.from(hashCode(email, code.trim()));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const next = await new SignJWT({ ...payload, tries: tries + 1 }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(Number(payload.exp)).sign(secret());
      jar.set(OTP, next, { ...cookieOpts, maxAge: 600 });
      return { ok: false as const, error: "That code is not right. Check the email and try again." };
    }
    jar.delete(OTP);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Your code expired. Request a new one." };
  }
}

export type Session = { email: string; customerId: string; name?: string };

export async function createSession(s: Session) {
  const token = await new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  (await cookies()).set(SESSION, token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { email: String(payload.email), customerId: String(payload.customerId), name: payload.name ? String(payload.name) : undefined };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(SESSION);
}
