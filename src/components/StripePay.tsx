"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { naira } from "@/lib/format";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = pk ? loadStripe(pk) : null;
export const stripeAppearance = { theme: "stripe" as const, variables: { colorPrimary: "#10213B", borderRadius: "10px", fontFamily: "Instrument Sans Variable, system-ui, sans-serif" } };

/** Card form for a payment that already has a client secret (chip-ins, gift cards). */
export function StripePay({ clientSecret, amount, label = "Pay", onPaid }: { clientSecret: string; amount: number; label?: string; onPaid: (paymentIntentId: string) => void }) {
  if (!stripePromise) return <p className="text-sm text-flare">Card payments are not switched on yet.</p>;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <Inner amount={amount} label={label} onPaid={onPaid} />
    </Elements>
  );
}

function Inner({ amount, label, onPaid }: { amount: number; label: string; onPaid: (id: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setBusy(true); setErr("");
      const r = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: `${location.origin}/checkout/success` } });
      if (r.error) { setErr(r.error.message || "Payment failed."); setBusy(false); return; }
      onPaid(r.paymentIntent.id);
    }}>
      <PaymentElement />
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
      <button className="btn btn-sun w-full" disabled={busy || !stripe}>{busy ? "Processing…" : `${label} ${naira(amount)}`}</button>
    </form>
  );
}
