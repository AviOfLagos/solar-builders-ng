import { body, fail, ok, route, str, limitIp } from "@/lib/server/api";
import { appleSignIn } from "@/lib/server/apple";

/** Sign in with Apple for the iOS app: { identityToken, fullName? } → { user, token, created }. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "apple", 30, 900);
  const b = await body<{ identityToken: string; fullName: string }>(req);
  const r = await appleSignIn(str(b.identityToken, 4096), str(b.fullName, 80));
  return "error" in r ? fail(String(r.error), r.status) : ok(r);
});
