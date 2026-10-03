import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { stripe } from "@/lib/server/stripe";

/** Starts adding a new card to the signed-in shopper's wallet. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in to save cards." }, { status: 401 });
  const { nickname } = await req.json().catch(() => ({}));
  const si = await stripe().setupIntents.create({
    customer: s.customerId,
    allowed_payment_method_types: ["card"],
    usage: "off_session",
    metadata: { nickname: String(nickname || "").slice(0, 40) },
  });
  return NextResponse.json({ clientSecret: si.client_secret });
}

/** Called after confirmSetup succeeds so the nickname lands on the card itself. */
export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { setupIntentId } = await req.json().catch(() => ({}));
  const si = await stripe().setupIntents.retrieve(String(setupIntentId));
  if (si.customer !== s.customerId || si.status !== "succeeded") return NextResponse.json({ error: "Card was not saved." }, { status: 400 });
  const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
  if (pm && si.metadata?.nickname) await stripe().paymentMethods.update(pm, { metadata: { nickname: si.metadata.nickname } });
  return NextResponse.json({ ok: true });
}
