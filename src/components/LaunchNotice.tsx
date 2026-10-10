"use client";
import { usePayOptions } from "./PayWith";
import { STORE } from "@/config/store";

/** Shown on every page while the payment switch is off, so nobody pays for something we can't deliver yet. */
export function LaunchNotice() {
  const o = usePayOptions();
  if (!o || o.open !== false) return null;
  return (
    <div className="bg-lemon-tint text-ink">
      <p className="mx-auto max-w-7xl px-4 py-2 text-center text-sm">
        We&apos;re not officially live yet, so online payment is off. Browse freely, or <a className="font-semibold underline underline-offset-4" href={`https://wa.me/${STORE.whatsapp}`}>message us on WhatsApp</a> to order.
      </p>
    </div>
  );
}
