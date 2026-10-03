"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";
import { api } from "@/lib/client";

type Result = {
  ok?: boolean; kind?: string; paymentStatus?: string; amount?: number; emailed?: boolean; error?: string;
  order?: { ref: string; phone: string; email: string; installer: boolean; recipient: { name: string } | null } | null;
  pool?: { id: string; title: string; goal: number; raised: number; status: string } | null;
  code?: string;
};

function Success() {
  const q = useSearchParams();
  const id = q.get("payment_intent");
  const orderRef = q.get("order");
  const clear = useCart((s) => s.clear);
  const [r, setR] = useState<Result | null>(null);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (orderRef) { clear(); return; }
    if (!id) return;
    api<Result>(`/payments/${id}`, { method: "POST" })
      .then((d) => { setR(d); if (d.kind === "order" && (d.paymentStatus === "succeeded" || d.paymentStatus === "processing")) clear(); })
      .catch((e) => setR({ error: (e as Error).message }));
  }, [id, orderRef, clear]);

  if (orderRef)
    return <Shell title="Thank you. We've got your order."><p className="text-lg text-ink-2">Order <b className="text-ink">{orderRef}</b> was paid with your gift card and is <b className="text-ink">pending</b>. We'll call shortly to arrange delivery.</p><Actions /></Shell>;
  if (!id) return <Shell title="Nothing to show here"><Link href="/shop" className="btn btn-ink">Continue shopping</Link></Shell>;
  if (!r) return <Shell title="Confirming your payment…"><p className="text-mute">This takes a few seconds.</p></Shell>;
  if (r.error || (r.paymentStatus !== "succeeded" && r.paymentStatus !== "processing"))
    return <Shell title="Your payment didn't go through"><p className="text-ink-2">{r.error || "The card payment was not completed. You have not been charged for this attempt."}</p><Link href="/checkout" className="btn btn-sun mt-6">Try again</Link></Shell>;

  if (r.kind === "contribution" && r.pool)
    return (
      <Shell title="Thank you for chipping in!">
        <p className="text-lg text-ink-2">You added <b className="num text-ink">{naira(r.amount || 0)}</b> to <b className="text-ink">{r.pool.title}</b>. It's now at <b className="num text-ink">{naira(r.pool.raised)}</b> of {naira(r.pool.goal)}{r.pool.status === "funded" ? ". Goal reached, so we're placing the order!" : "."}</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href={`/fund/${r.pool.id}`} className="btn btn-ink">Back to the page</Link><Link href="/fund/new" className="btn btn-ghost">Start your own</Link></div>
      </Shell>
    );

  if (r.kind === "gift_card")
    return (
      <Shell title="Your gift card is ready">
        <p className="text-lg text-ink-2">A <b className="num text-ink">{naira(r.amount || 0)}</b> solar gift card. Share this code with them. It works at checkout on this site.</p>
        <p className="font-display num mt-6 select-all rounded-xl bg-haze p-5 text-center text-3xl font-bold tracking-[0.2em]">{r.code}</p>
        {r.emailed && <p className="mt-3 text-sm text-mute">We've also emailed it.</p>}
        <Actions />
      </Shell>
    );

  const o = r.order;
  return (
    <Shell title="Thank you. We've got your order.">
      <p className="text-lg leading-relaxed text-ink-2">
        Order <b className="text-ink">{o?.ref}</b> for <b className="num text-ink">{naira(r.amount || 0)}</b> is <b className="text-ink">pending</b>. We'll call {o?.recipient ? <b className="text-ink">{o.recipient.name}</b> : "you"} on <b className="text-ink">{o?.phone}</b> shortly to arrange delivery{o?.installer ? " and installation" : ""}.
      </p>
      {r.emailed && <p className="mt-3 text-mute">A copy has been sent to {o?.email}.</p>}
      <Actions />
    </Shell>
  );
}

function Actions() {
  return <div className="mt-8 flex flex-wrap gap-3"><Link href="/shop" className="btn btn-ink">Continue shopping</Link><Link href="/account" className="btn btn-ghost">My account</Link></div>;
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
