import { db } from "@/lib/server/db";
import { fail, ok, route } from "@/lib/server/api";
import { stripe } from "@/lib/server/stripe";
import { finalizePayment } from "@/lib/server/commerce";
import { mailConfigured } from "@/lib/server/mail";

/** Called after the card step (web success page or app). Returns what was bought. */
export const POST = route(async (_req: Request, ctx: RouteContext<"/api/v1/payments/[id]">) => {
  const { id } = await ctx.params;
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) return fail("Invalid payment.");
  const pi = await stripe().paymentIntents.retrieve(id);
  const r = await finalizePayment(pi);
  const sql = await db();
  const base = { paymentStatus: pi.status, amount: pi.amount / 100, emailed: mailConfigured(), kind: pi.metadata.kind || "order" };
  if (pi.metadata.kind === "contribution") {
    const [p] = await sql`select id, title, goal, raised, status from pools where id = ${pi.metadata.pool_id}`;
    return ok({ ...base, ...r, pool: p ?? null });
  }
  if (pi.metadata.kind === "gift_card") return ok({ ...base, ...r });
  const [o] = await sql`select id, buyer, delivery, recipient, installer, status from orders where id = ${pi.metadata.order_ref}`;
  return ok({ ...base, ...r, order: o ? { ref: o.id, phone: o.delivery.phone, email: o.buyer.email, installer: o.installer, recipient: o.recipient, status: o.status } : null });
});
