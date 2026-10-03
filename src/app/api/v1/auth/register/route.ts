import { db, id } from "@/lib/server/db";
import { body, fail, ok, route, str } from "@/lib/server/api";
import { createSession, hashPassword } from "@/lib/server/session";
import { isEmail, normalizePhone } from "@/lib/format";

export const POST = route(async (req: Request) => {
  const b = await body<{ name: string; email: string; password: string; phone: string }>(req);
  const email = str(b.email, 120).toLowerCase();
  const name = str(b.name, 80);
  const password = String(b.password ?? "");
  if (name.length < 2) return fail("Enter your name.", 400, { fields: { name: "Enter your name." } });
  if (!isEmail(email)) return fail("Enter a valid email.", 400, { fields: { email: "Enter a valid email." } });
  if (password.length < 8) return fail("Use at least 8 characters for your password.", 400, { fields: { password: "At least 8 characters." } });
  const sql = await db();
  const [exists] = await sql`select 1 from users where email = ${email}`;
  if (exists) return fail("An account with this email already exists. Sign in instead.", 409, { fields: { email: "Already registered." } });
  const uid = id();
  await sql`insert into users ${sql({ id: uid, email, name, phone: normalizePhone(str(b.phone, 20)), password_hash: await hashPassword(password) })}`;
  const token = await createSession({ uid, email, name });
  return ok({ user: { id: uid, email, name }, token });
});
