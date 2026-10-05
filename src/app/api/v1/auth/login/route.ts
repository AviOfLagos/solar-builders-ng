import { db } from "@/lib/server/db";
import { body, fail, ok, route, str, limitIp, limit } from "@/lib/server/api";
import { checkPassword, createSession } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  await limitIp(req, "login", 20, 900);
  const b = await body<{ email: string; password: string }>(req);
  const email = str(b.email, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return fail("Enter your email and password.", 400);
  await limit(`login-email:${email}`, 10, 900);
  const sql = await db();
  const [u] = await sql`select id, email, name, password_hash, google_sub from users where email = ${email} and deleted_at is null`;
  if (!u) return fail("There's no account with this email yet.", 401, { code: "no_account" });
  const good = await checkPassword(password, u?.password_hash);
  if (!good) {
    if (u && !u.password_hash && u.google_sub) return fail("This account signs in with Google. Use the Google button.", 401);
    return fail("Email or password is not right.", 401);
  }
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return ok({ user: { id: u.id, email: u.email, name: u.name }, token });
});
