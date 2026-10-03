import { db, id } from "@/lib/server/db";
import { body, fail, ok, route, str, limitIp } from "@/lib/server/api";
import { createSession, verifyGoogle, googleClientIds } from "@/lib/server/session";

/** Continue with Google. The web button and the app both send Google's ID token here. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "google", 30, 900);
  if (!googleClientIds().length) return fail("Google sign-in isn't switched on yet.", 503);
  const g = await verifyGoogle(str((await body<{ credential: string }>(req)).credential, 4096));
  if (!g) return fail("Google sign-in didn't go through. Try again.", 401);
  const sql = await db();
  let [u] = await sql`select id, email, name from users where google_sub = ${g.sub}`;
  let created = false;
  if (!u) {
    // Google has verified this email, so it's safe to link it to an existing account.
    [u] = await sql`update users set google_sub = ${g.sub}, name = case when name = '' then ${g.name} else name end where email = ${g.email} and google_sub is null returning id, email, name`;
  }
  if (!u) {
    const uid = id();
    [u] = await sql`insert into users ${sql({ id: uid, email: g.email, name: g.name || g.email.split("@")[0], google_sub: g.sub, password_hash: null })} on conflict (email) do nothing returning id, email, name`;
    if (!u) return fail("This email is linked to another Google account.", 409);
    created = true;
  }
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return ok({ user: { id: u.id, email: u.email, name: u.name }, token, created });
});
