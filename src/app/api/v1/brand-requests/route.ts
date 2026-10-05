import { body, ok, route, limitIp } from "@/lib/server/api";
import { saveBrandRequest } from "@/lib/server/leads";

/** "Feature your brand" form on the brand wall. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "brand-requests", 5, 3600);
  return ok(await saveBrandRequest(await body(req)));
});
