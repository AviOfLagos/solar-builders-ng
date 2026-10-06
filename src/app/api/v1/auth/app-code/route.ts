import { createHash, randomBytes } from "node:crypto";
import { body, fail, ok, route, requireUser, str, limitIp } from "@/lib/server/api";
import { db } from "@/lib/server/db";

const h = (v: string) => createHash("sha256").update(v).digest("hex");

/** The website, signed in with Google, asks for a one-time code to hand to the phone app. Valid for 2 minutes, once. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "app-code", 20, 900);
  const s = await requireUser();
  if (s instanceof Response) return s;
  const state = str((await body<{ state: string }>(req)).state, 100);
  if (state.length < 16) return fail("Missing sign-in request. Start again from the app.", 400);
  const code = randomBytes(24).toString("base64url");
  const sql = await db();
  await sql`delete from app_codes where expires_at < now()`;
  await sql`insert into app_codes (code_hash, state_hash, user_id, expires_at) values (${h(code)}, ${h(state)}, ${s.uid}, now() + interval '2 minutes')`;
  return ok({ code });
});
