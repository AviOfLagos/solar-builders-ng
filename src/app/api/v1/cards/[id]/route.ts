import { body, fail, ok, requireUser, route, str } from "@/lib/server/api";
import { customerFor, ownsCard, stripe, stripeConfigured } from "@/lib/server/stripe";
import { isPaystackCardId } from "@/lib/server/pay";
import { db } from "@/lib/server/db";

/** Rename a saved card. Naira cards (pc_…) live with us; international cards (pm_…) live in Stripe. */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/v1/cards/[id]">) => {
  const { id } = await ctx.params;
  const s = await requireUser();
  if (s instanceof Response) return s;
  const n = str((await body<{ nickname: string }>(req)).nickname, 40);
  if (!n) return fail("Give the card a name.", 400, { fields: { nickname: "e.g. GTB salary card" } });
  if (isPaystackCardId(id)) {
    const sql = await db();
    const [c] = await sql`update paystack_cards set nickname = ${n} where id = ${id} and user_id = ${s.uid} returning id`;
    return c ? ok({ ok: true }) : fail("Card not found.", 404);
  }
  if (!stripeConfigured()) return fail("Card not found.", 404);
  if (!(await ownsCard(await customerFor(s.uid), id))) return fail("Card not found.", 404);
  await stripe().paymentMethods.update(id, { metadata: { nickname: n } });
  return ok({ ok: true });
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/v1/cards/[id]">) => {
  const { id } = await ctx.params;
  const s = await requireUser();
  if (s instanceof Response) return s;
  if (isPaystackCardId(id)) {
    const sql = await db();
    const [c] = await sql`delete from paystack_cards where id = ${id} and user_id = ${s.uid} returning id`;
    return c ? ok({ ok: true }) : fail("Card not found.", 404);
  }
  if (!stripeConfigured()) return fail("Card not found.", 404);
  if (!(await ownsCard(await customerFor(s.uid), id))) return fail("Card not found.", 404);
  await stripe().paymentMethods.detach(id);
  return ok({ ok: true });
});
