import "server-only";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { db, id } from "./db";
import { createSession } from "./session";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** Bundle IDs (and any Services ID) whose Apple tokens we accept. */
export function appleClientIds() {
  return (process.env.APPLE_CLIENT_IDS || "ng.solarbuilders.gosolarme").split(",").map((s) => s.trim()).filter(Boolean);
}

async function verifyApple(identityToken: string) {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience: appleClientIds() });
    if (!payload.sub) return null;
    // Apple sends email_verified as a boolean or the string "true". Private relay addresses are real, verified inboxes.
    const verified = payload.email_verified === true || payload.email_verified === "true";
    const email = verified && typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    return { sub: String(payload.sub), email };
  } catch {
    return null;
  }
}

/**
 * Sign in with Apple from the app. Apple gives the name only on the very first sign-in, so the
 * app passes it along; the email can be a private relay address.
 */
export async function appleSignIn(identityToken: string, fullName: string) {
  const a = await verifyApple(identityToken);
  if (!a) return { error: "Apple sign-in didn't go through. Try again.", status: 401 as const };
  const sql = await db();
  let [u] = await sql`select id, email, name from users where apple_sub = ${a.sub} and deleted_at is null`;
  let created = false;
  if (!u && a.email) {
    [u] = await sql`update users set apple_sub = ${a.sub}, name = case when name = '' then ${fullName} else name end where email = ${a.email} and apple_sub is null and deleted_at is null returning id, email, name`;
  }
  if (!u) {
    if (!a.email) return { error: "Apple didn't share an email. Try again, or sign in another way.", status: 400 as const };
    [u] = await sql`insert into users ${sql({ id: id(), email: a.email, name: fullName || a.email.split("@")[0], apple_sub: a.sub, password_hash: null })} on conflict (email) do nothing returning id, email, name`;
    if (!u) return { error: "This email is linked to another Apple account.", status: 409 as const };
    created = true;
  }
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return { user: { id: u.id as string, email: u.email as string, name: u.name as string }, token, created };
}
