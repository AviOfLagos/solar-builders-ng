import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/server/stripe";
import { finalizeOrder } from "@/lib/server/orders";
import { brevoConfigured } from "@/lib/server/brevo";

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  const { id } = await req.json().catch(() => ({}));
  if (!/^pi_[A-Za-z0-9]+$/.test(String(id))) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const pi = await stripe().paymentIntents.retrieve(String(id));
  const r = await finalizeOrder(pi);
  return NextResponse.json({ ...r, ref: pi.metadata.order_ref, status: pi.status, email: pi.metadata.email, phone: pi.metadata.phone, installer: pi.metadata.installer, amount: pi.amount / 100, emailed: brevoConfigured() });
}
