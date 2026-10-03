import { body, fail, ok, route, str, limitIp } from "@/lib/server/api";
import { googleClientIds } from "@/lib/server/session";
import { googleSignIn } from "@/lib/server/google";

/** Continue with Google for the app: it sends Google's ID token here and gets a session token back. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "google", 30, 900);
  if (!googleClientIds().length) return fail("Google sign-in isn't switched on yet.", 503);
  const r = await googleSignIn(str((await body<{ credential: string }>(req)).credential, 4096));
  return "error" in r ? fail(String(r.error), r.status) : ok(r);
});
