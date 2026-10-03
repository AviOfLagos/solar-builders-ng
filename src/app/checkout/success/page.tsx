"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

type Result = { ok?: boolean; ref?: string; status?: string; email?: string; phone?: string; installer?: string; amount?: number; emailed?: boolean; error?: string };

function Success() {
  const id = useSearchParams().get("payment_intent");
  const clear = useCart((s) => s.clear);
  const [r, setR] = useState<Result | null>(null);
  const once = useRef(false);
  useEffect(() => {
    if (!id || once.current) return;
    once.current = true;
    fetch("/api/order/finalize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
      .then((x) => x.json())
      .then((d: Result) => { setR(d); if (d.status === "succeeded" || d.status === "processing") clear(); })
      .catch(() => setR({ error: "We couldn't load your order. If you were charged, we'll still contact you." }));
  }, [id, clear]);

  if (!id) return <Shell title="No order found"><Link href="/shop" className="btn btn-ink">Continue shopping</Link></Shell>;
  if (!r) return <Shell title="Confirming your payment…"><p className="text-mute">This takes a few seconds.</p></Shell>;
  if (r.error || (r.status !== "succeeded" && r.status !== "processing"))
    return (
      <Shell title="Your payment didn't go through">
        <p className="text-ink-2">{r.error || "The card payment was not completed. You have not been charged for this attempt."}</p>
        <Link href="/checkout" className="btn btn-sun mt-6">Try again</Link>
      </Shell>
    );
  return (
    <Shell title="Thank you. We've got your order.">
      <p className="text-lg leading-relaxed text-ink-2">
        Order <b className="text-ink">{r.ref}</b> for <b className="num text-ink">{naira(r.amount || 0)}</b> is <b className="text-ink">pending</b>. We're working on it and will call you on <b className="text-ink">{r.phone}</b> shortly to arrange delivery{r.installer === "yes" ? " and connect you with an installer" : ""}.
      </p>
      {r.emailed && <p className="mt-3 text-mute">A copy has been sent to {r.email}.</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-ink">Continue shopping</Link>
        <Link href="/account/cards" className="btn btn-ghost">Manage saved cards</Link>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="rounded-2xl border border-line bg-paper p-8 sm:p-10">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-sun text-2xl" aria-hidden>☀</div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Success /></Suspense>;
}
