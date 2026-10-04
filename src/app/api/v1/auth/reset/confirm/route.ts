import { body, ok, route, limitIp } from "@/lib/server/api";
import { confirmReset } from "@/lib/server/account";

/** { email, code, password } → sets the new password and signs in: { user, token }. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "reset-confirm", 20, 3600);
  return ok(await confirmReset(await body(req)));
});
