import { ok, requireUser, route } from "@/lib/server/api";
import { userCart } from "@/lib/server/leads";

/** The unfinished cart saved against this account, so another device can pick it up. */
export const GET = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  return ok(await userCart(s.uid));
});
