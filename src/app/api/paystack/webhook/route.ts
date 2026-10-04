import { NextResponse } from "next/server";
import { paystackConfigured, paystackSignatureOk, isPaystackRef } from "@/lib/server/paystack";
import { fetchPayment } from "@/lib/server/pay";
import { finalizePayment } from "@/lib/server/payments";
import { notifyOwner } from "@/lib/server/mail";
import { naira } from "@/lib/format";

type Event = { event: string; data: { reference?: string; amount?: number; status?: string; transaction?: { reference?: string }; transaction_reference?: string; reason?: string; message?: string } };

/** Paystack tells us about payments here, so they count even if the buyer closes the page. */
export async function POST(req: Request) {
  if (!paystackConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = await req.text();
  if (!paystackSignatureOk(raw, req.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  let ev: Event;
  try { ev = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }
  try {
    const ref = ev.data?.reference || ev.data?.transaction?.reference || ev.data?.transaction_reference || "";
    switch (ev.event) {
      case "charge.success": {
        // Payments that aren't ours (no ps_ reference) are ignored. Re-read from Paystack rather than trusting the body.
        if (!isPaystackRef(ref)) break;
        const p = await fetchPayment(ref);
        if (p) await finalizePayment(p);
        break;
      }
      case "refund.failed":
        await notifyOwner(`PAYSTACK REFUND FAILED for ${ref || "a payment"}${ev.data.amount ? ` (${naira(ev.data.amount / 100)})` : ""}. Check the Paystack dashboard.`);
        break;
      case "charge.dispute.create":
        await notifyOwner(`PAYSTACK DISPUTE on ${ref || "a payment"}${ev.data.amount ? ` (${naira(ev.data.amount / 100)})` : ""}: ${ev.data.reason || ev.data.message || ""}. Respond in Paystack.`);
        break;
    }
  } catch (e) {
    console.error("[paystack webhook]", ev.event, e);
    // A 500 makes Paystack retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
