"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { naira } from "@/lib/format";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = pk ? loadStripe(pk) : null;
export const stripeAppearance = { theme: "stripe" as const, variables: { colorPrimary: "#17201B", borderRadius: "10px", fontFamily: "Instrument Sans Variable, system-ui, sans-serif" } };

/** Where to go after a card payment, carrying the secret that lets the success page show details. */
export const successUrl = (id: string, clientSecret: string) =>
  `/checkout/success?payment_intent=${encodeURIComponent(id)}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}`;

/** Card form for a payment that already has a client secret (chip-ins, gift cards). */
export function StripePay({ clientSecret, amount, label = "Pay", onPaid }: { clientSecret: string; amount: number; label?: string; onPaid: (paymentIntentId: string, clientSecret: string) => void }) {
  if (!stripePromise) return <p className="text-sm text-flare">Card payments are not switched on yet.</p>;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <Inner amount={amount} label={label} clientSecret={clientSecret} onPaid={onPaid} />
    </Elements>
  );
}

function Inner({ amount, label, clientSecret, onPaid }: { amount: number; label: string; clientSecret: string; onPaid: (id: string, secret: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!stripe || !elements || busy) return;
      setBusy(true); setErr("");
      try {
        const r = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: `${location.origin}/checkout/success` } });
        if (r.error) { setErr(r.error.message || "Payment failed. Try again or use another card."); setBusy(false); return; }
        onPaid(r.paymentIntent.id, clientSecret);
      } catch {
        setErr("No connection. Check your internet and try again.");
        setBusy(false);
      }
    }}>
      <PaymentElement onReady={() => setReady(true)} onLoadError={() => setErr("The card form couldn't load. Refresh the page and try again.")} />
      {!ready && !err && <p className="text-sm text-mute">Loading the card form…</p>}
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <button className="btn btn-sun w-full" disabled={busy || !stripe || !ready}>{busy ? "Processing…" : `${label} ${naira(amount)}`}</button>
    </form>
  );
}
