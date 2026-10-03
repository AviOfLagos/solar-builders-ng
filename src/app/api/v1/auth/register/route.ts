import { db, id } from "@/lib/server/db";
import { body, fail, ok, route, str, limitIp } from "@/lib/server/api";
import { createSession, hashPassword } from "@/lib/server/session";
import { isEmail, isName, normalizePhone, NG_PHONE, ngE164 } from "@/lib/format";

export const POST = route(async (req: Request) => {
  await limitIp(req, "register", 10, 3600);
  const b = await body<{ name: string; email: string; password: string; phone: string }>(req);
  const email = str(b.email, 120).toLowerCase();
  const name = str(b.name, 80);
  const password = typeof b.password === "string" ? b.password : "";
  const phone = normalizePhone(str(b.phone, 24));
  const fields: Record<string, string> = {};
  if (!isName(name)) fields.name = "Enter your name.";
  if (!isEmail(email)) fields.email = "Enter a valid email.";
  if (password.length < 8 || password.length > 128) fields.password = "Use 8 to 128 characters.";
  if (phone && !NG_PHONE.test(phone)) fields.phone = "Enter a Nigerian mobile number or leave it empty.";
  if (Object.keys(fields).length) return fail("Check the highlighted fields.", 400, { fields });
  const sql = await db();
  const [exists] = await sql`select 1 from users where email = ${email}`;
  if (exists) return fail("An account with this email already exists. Sign in instead.", 409, { fields: { email: "Already registered." } });
  const uid = id();
  await sql`insert into users ${sql({ id: uid, email, name, phone: phone ? ngE164(phone) : "", password_hash: await hashPassword(password) })}`;
  const token = await createSession({ uid, email, name });
  return ok({ user: { id: uid, email, name }, token });
});
