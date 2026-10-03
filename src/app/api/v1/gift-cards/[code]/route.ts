import { ok, fail, route, limitIp } from "@/lib/server/api";
import { giftCardBalance } from "@/lib/server/orders";

export const GET = route(async (req: Request, ctx: RouteContext<"/api/v1/gift-cards/[code]">) => {
  await limitIp(req, "giftcheck", 20, 600);
  const g = await giftCardBalance((await ctx.params).code);
  return g ? ok(g) : fail("That code isn't valid or has no balance.", 404);
});
