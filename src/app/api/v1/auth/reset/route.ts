import { body, ok, route, limitIp, limit, str } from "@/lib/server/api";
import { startReset } from "@/lib/server/account";

/** Forgot password: { email } → emails a 6-digit code (15 minutes). Same answer whether or not the account exists. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "reset", 10, 3600);
  const b = await body<{ email: string }>(req);
  await limit(`reset-email:${str(b.email, 120).toLowerCase()}`, 3, 900);
  return ok(await startReset(b.email));
});
