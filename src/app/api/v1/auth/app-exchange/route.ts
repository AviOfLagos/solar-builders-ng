import { createHash } from "node:crypto";
import { body, fail, ok, route, str, limitIp } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { createSession } from "@/lib/server/session";

const h = (v: string) => createHash("sha256").update(v).digest("hex");

/** The app trades the code (which came back through a link) plus the secret only it knows for a normal session. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "app-exchange", 30, 900);
  const b = await body<{ code: string; state: string }>(req);
  const code = str(b.code, 100), state = str(b.state, 100);
  if (!code || state.length < 16) return fail("This sign-in link isn't valid. Try again.", 400);
  const sql = await db();
  const [r] = await sql`update app_codes set used = true where code_hash = ${h(code)} and state_hash = ${h(state)} and not used and expires_at > now() returning user_id`;
  if (!r) return fail("This sign-in link has expired. Try again.", 400);
  const [u] = await sql`select id, email, name from users where id = ${r.user_id} and deleted_at is null`;
  if (!u) return fail("Account not found.", 404);
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return ok({ user: { id: u.id, email: u.email, name: u.name }, token });
});
