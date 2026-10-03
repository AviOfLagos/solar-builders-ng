import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { ownsCard, stripe } from "@/lib/server/stripe";

export async function PATCH(req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await ownsCard(s.customerId, id))) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  const { nickname } = await req.json().catch(() => ({}));
  const n = String(nickname || "").trim().slice(0, 40);
  if (!n) return NextResponse.json({ error: "Give the card a name." }, { status: 400 });
  await stripe().paymentMethods.update(id, { metadata: { nickname: n } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await ownsCard(s.customerId, id))) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  await stripe().paymentMethods.detach(id);
  return NextResponse.json({ ok: true });
}
