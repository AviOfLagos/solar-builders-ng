import { body, ok, route, currentUser, limitIp } from "@/lib/server/api";
import { saveLead } from "@/lib/server/leads";

/** Saves a phone or email and the cart as soon as someone gives one, so we can follow up. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "leads", 30, 3600);
  return ok(await saveLead(await body(req), await currentUser()));
});
