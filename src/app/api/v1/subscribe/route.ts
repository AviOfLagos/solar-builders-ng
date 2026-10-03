import { db } from "@/lib/server/db";
import { body, fail, ok, route, str, oneOf, limitIp } from "@/lib/server/api";
import { isEmail } from "@/lib/format";

export const POST = route(async (req: Request) => {
  await limitIp(req, "subscribe", 10, 3600);
  const b = await body(req);
  const email = str(b.email, 120).toLowerCase();
  if (!isEmail(email)) return fail("Enter a valid email address.");
  const sql = await db();
  await sql`insert into subscribers ${sql({ email, source: oneOf(b.source, ["footer", "guide", "home", "app"] as const, "footer") })} on conflict (email) do nothing`;
  return ok({ ok: true });
});
