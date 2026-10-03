import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { finalizePayment } from "@/lib/server/commerce";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") || "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }
  if (event.type === "payment_intent.succeeded") {
    await finalizePayment(await stripe().paymentIntents.retrieve(event.data.object.id));
  }
  return NextResponse.json({ received: true });
}
