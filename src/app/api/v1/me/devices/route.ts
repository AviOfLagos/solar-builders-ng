import { body, fail, ok, requireUser, route, str, oneOf } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { isPushToken } from "@/lib/server/push";

/** Register this phone for push: { token: "ExponentPushToken[…]", platform: "ios"|"android" }. Call after every sign-in. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const b = await body<{ token: string; platform: string }>(req);
  const token = str(b.token, 200);
  if (!isPushToken(token)) return fail("Not a push token.");
  const sql = await db();
  // A phone belongs to whoever signed in on it last.
  await sql`insert into devices (token, user_id, platform) values (${token}, ${s.uid}, ${oneOf(b.platform, ["ios", "android"] as const, "android")})
    on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()`;
  return ok({ ok: true });
});
