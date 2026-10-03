import { body, fail, ok, requireUser, route, str } from "@/lib/server/api";
import { customerFor, ownsCard, stripe, stripeConfigured } from "@/lib/server/stripe";

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/v1/cards/[id]">) => {
  const { id } = await ctx.params;
  const s = await requireUser();
  if (s instanceof Response) return s;
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  const n = str((await body<{ nickname: string }>(req)).nickname, 40);
  if (!n) return fail("Give the card a name.", 400, { fields: { nickname: "e.g. GTB salary card" } });
  if (!(await ownsCard(await customerFor(s.uid), id))) return fail("Card not found.", 404);
  await stripe().paymentMethods.update(id, { metadata: { nickname: n } });
  return ok({ ok: true });
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/v1/cards/[id]">) => {
  const { id } = await ctx.params;
  const s = await requireUser();
  if (s instanceof Response) return s;
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  if (!(await ownsCard(await customerFor(s.uid), id))) return fail("Card not found.", 404);
  await stripe().paymentMethods.detach(id);
  return ok({ ok: true });
});
