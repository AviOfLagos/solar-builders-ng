import { ok, fail, route } from "@/lib/server/api";
import { giftCardBalance } from "@/lib/server/commerce";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/v1/gift-cards/[code]">) => {
  const g = await giftCardBalance((await ctx.params).code);
  return g ? ok(g) : fail("That code isn't valid or has no balance.", 404);
});
