import { body, fail, ok, route, str, requireTeam } from "@/lib/server/api";
import { setOrderStatus, refundOrder } from "@/lib/server/orders";

/** Move a paid order along: confirmed, out for delivery, delivered, installed. */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/v1/team/orders/[id]">) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok(await setOrderStatus((await ctx.params).id, str((await body<{ status: string }>(req)).status, 30)));
});

/** Full refund: card money to the card, gift card value to the gift card, pool money to each supporter. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/v1/team/orders/[id]">) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const reason = str((await body<{ reason: string }>(req)).reason, 200);
  if (reason.length < 3) return fail("Say why, for the record.", 400, { fields: { reason: "Required." } });
  return ok(await refundOrder((await ctx.params).id, `${reason} (by ${s.email})`));
});
