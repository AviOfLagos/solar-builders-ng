import { db } from "@/lib/server/db";
import { body, fail, ok, route, str } from "@/lib/server/api";
import { checkPassword, createSession } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  const b = await body<{ email: string; password: string }>(req);
  const email = str(b.email, 120).toLowerCase();
  const sql = await db();
  const [u] = await sql`select id, email, name, password_hash from users where email = ${email}`;
  if (!u || !(await checkPassword(String(b.password ?? ""), u.password_hash))) return fail("Email or password is not right.", 401);
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return ok({ user: { id: u.id, email: u.email, name: u.name }, token });
});
