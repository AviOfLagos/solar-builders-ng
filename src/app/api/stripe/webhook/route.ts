import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, webhookSecret } from "@/lib/server/stripe";
import { finalizePayment } from "@/lib/server/payments";
import { cancelAwaiting } from "@/lib/server/orders";
import { notifyOwner } from "@/lib/server/mail";
import { db } from "@/lib/server/db";
import { naira } from "@/lib/format";

/** Stripe tells us about payments here, so they count even if the buyer closes the page. */
export async function POST(req: Request) {
  const secret = await webhookSecret();
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        // Re-read from Stripe rather than trusting the event body.
        await finalizePayment(await stripe().paymentIntents.retrieve(event.data.object.id));
        break;
      case "payment_intent.canceled": {
        const sql = await db();
        const [o] = await sql`select id from orders where pi_id = ${event.data.object.id} and status = 'awaiting_payment'`;
        if (o) await cancelAwaiting(o.id, "payment cancelled");
        break;
      }
      case "charge.dispute.created": {
        const d = event.data.object;
        await notifyOwner(`DISPUTE on ${typeof d.payment_intent === "string" ? d.payment_intent : d.payment_intent?.id}: ${naira(d.amount / 100)} — ${d.reason}. Respond in Stripe.`);
        break;
      }
    }
  } catch (e) {
    console.error("[webhook]", event.type, e);
    // A 500 makes Stripe retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
