import { db } from "@/lib/server/db";
import { body, fail, ok, route, str } from "@/lib/server/api";
import { isEmail } from "@/lib/format";

export const POST = route(async (req: Request) => {
  const b = await body<{ email: string; source: string }>(req);
  const email = str(b.email, 120).toLowerCase();
  if (!isEmail(email)) return fail("Enter a valid email address.");
  const sql = await db();
  await sql`insert into subscribers ${sql({ email, source: str(b.source, 40) })} on conflict (email) do nothing`;
  return ok({ ok: true });
});
