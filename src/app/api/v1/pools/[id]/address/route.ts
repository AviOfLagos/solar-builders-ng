import { body, ok, requireUser, route } from "@/lib/server/api";
import { setPoolAddress } from "@/lib/server/pools";

/** Owner only: add the delivery address (it can wait until the kit is funded). */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/pools/[id]/address">) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  return ok(await setPoolAddress(s, (await ctx.params).id, await body(req)));
});
