"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export type Provider = "paystack" | "stripe";
export type PayOptions = { naira: boolean; intl: boolean; minCharge: number; stripePublishableKey?: string | null };

let cached: Promise<PayOptions> | null = null;

/** Which ways to pay are switched on. Asked once per page load. */
export function usePayOptions() {
  const [o, setO] = useState<PayOptions | null>(null);
  useEffect(() => {
    cached ??= api<PayOptions>("/payments").catch(() => { cached = null; return { naira: false, intl: false, minCharge: 1000 }; });
    let live = true;
    cached.then((x) => live && setO(x));
    return () => { live = false; };
  }, []);
  return o;
}

export const defaultProvider = (o: PayOptions | null): Provider => (o && !o.naira && o.intl ? "stripe" : "paystack");

/** "Pay in naira" (Paystack: card, transfer, USSD) or "Card from abroad" (Stripe). Hidden when only one is on. */
export function PayWith({ options, value, onChange, disabled }: { options: PayOptions | null; value: Provider; onChange: (p: Provider) => void; disabled?: boolean }) {
  if (!options?.naira || !options.intl) return null;
  const choices: [Provider, string, string][] = [
    ["paystack", "Pay in naira", "Card, bank transfer or USSD"],
    ["stripe", "Card from abroad", "Visa, Mastercard, Amex"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How do you want to pay?">
      {choices.map(([p, title, sub]) => (
        <button type="button" key={p} role="radio" aria-checked={value === p} disabled={disabled} onClick={() => onChange(p)}
          className={`rounded-xl border p-3 text-left ${value === p ? "border-ink bg-mint-tint" : "border-line bg-white"}`}>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-mute">{sub}</span>
        </button>
      ))}
    </div>
  );
}

/** Sends the buyer to Paystack's secure page. They come back to /checkout/success. */
export const goToPaystack = (url: string) => { location.assign(url); };

export const paystackNote = "Naira payments are handled by Paystack. Cards from abroad by Stripe.";
