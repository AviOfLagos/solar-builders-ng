import "server-only";
import { db, id } from "./db";
import { createSession, verifyGoogle } from "./session";

/**
 * Signs in with a Google ID token: finds the account by Google id, links a verified email to an
 * existing account, or creates a new one. Used by the web (redirect) and the app (JSON).
 */
export async function googleSignIn(credential: string, nonce?: string) {
  const g = await verifyGoogle(credential, nonce);
  if (!g) return { error: "Google sign-in didn't go through. Try again.", status: 401 as const };
  const sql = await db();
  let [u] = await sql`select id, email, name from users where google_sub = ${g.sub}`;
  let created = false;
  if (!u) {
    // Google has verified this email, so it's safe to link it to an existing account.
    [u] = await sql`update users set google_sub = ${g.sub}, name = case when name = '' then ${g.name} else name end where email = ${g.email} and google_sub is null returning id, email, name`;
  }
  if (!u) {
    [u] = await sql`insert into users ${sql({ id: id(), email: g.email, name: g.name || g.email.split("@")[0], google_sub: g.sub, password_hash: null })} on conflict (email) do nothing returning id, email, name`;
    if (!u) return { error: "This email is linked to another Google account.", status: 409 as const };
    created = true;
  }
  await sql`update users set email_verified_at = coalesce(email_verified_at, now()) where id = ${u.id}`;
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return { user: { id: u.id as string, email: u.email as string, name: u.name as string }, token, created };
}
