"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";
import { api, setLeadId } from "@/lib/client";
import { Share } from "@/components/Share";
import { STORE } from "@/config/store";

type Result = {
  ok?: boolean; kind?: string; paymentStatus?: string; amount?: number; emailed?: boolean; error?: string;
  order?: { ref: string; phone?: string; email?: string; installer?: boolean; recipient?: { name: string } | null; status: string } | null;
  pool?: { id: string; title: string; goal: number; raised: number; status: string } | null;
  accepted?: number; refunded?: number;
  gift?: { code: string; amount: number; toName: string } | null;
};

function Success() {
  const q = useSearchParams();
  const id = q.get("payment_intent");
  const secret = q.get("payment_intent_client_secret") || "";
  const orderRef = q.get("order");
  const clear = useCart((s) => s.clear);
  const [r, setR] = useState<Result | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (orderRef) { clear(); setLeadId(null); return; }
    if (!id) return;
    let tries = 0;
    const check = () =>
      api<Result>(`/payments/${encodeURIComponent(id)}`, { body: { clientSecret: secret } })
        .then((d) => {
          // Card payments can take a few seconds to settle; ask again before giving up.
          if (d.paymentStatus === "processing" && tries++ < 6) { setTimeout(check, 2500); setR(d); return; }
          setR(d);
          if (d.kind === "order" && d.paymentStatus === "succeeded" && d.ok !== false) { clear(); setLeadId(null); }
        })
        .catch((e) => setR({ error: (e as Error).message }));
    check();
  }, [id, secret, orderRef, clear]);

  if (orderRef)
    return (
      <Shell title="Thank you. We've got your order.">
        <p className="text-lg text-ink-2">Order <b className="text-ink">{orderRef}</b> was paid with your gift card and is <b className="text-ink">pending</b>. We&apos;ll call shortly to arrange delivery.</p>
        <GoingSolar refId={orderRef} />
        <Actions />
      </Shell>
    );
  if (!id) return <Shell title="Nothing to show here"><Link href="/shop" className="btn btn-ink">Continue shopping</Link></Shell>;
  if (!r) return <Shell title="Confirming your payment…"><p className="text-mute">This takes a few seconds. Please don&apos;t close this page.</p></Shell>;
  if (r.paymentStatus === "processing")
    return <Shell title="Your bank is still confirming"><p className="text-ink-2">This can take a minute. We&apos;ll complete your order as soon as it clears, and you won&apos;t be charged twice. You can close this page.</p><Actions /></Shell>;
  if (r.error || r.paymentStatus !== "succeeded" || r.ok === false)
    return (
      <Shell title="Your payment didn't go through">
        <p className="text-ink-2">{r.error || "The card payment was not completed. You have not been charged for this attempt."}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={r.kind === "contribution" && r.pool ? `/fund/${r.pool.id}` : "/checkout"} className="btn btn-sun">Try again</Link><a className="btn btn-ghost" href={`https://wa.me/${STORE.whatsapp}`}>Get help on WhatsApp</a></div>
      </Shell>
    );

  if (r.kind === "contribution" && r.pool) {
    const p = r.pool;
    return (
      <Shell title={r.accepted ? "Thank you for chipping in!" : "The kit was already funded"}>
        {r.accepted ? (
          <p className="text-lg text-ink-2">You added <b className="num text-ink">{naira(r.accepted)}</b> to <b className="text-ink">{p.title}</b>. It&apos;s now at <b className="num text-ink">{naira(p.raised)}</b> of {naira(p.goal)}{p.status === "funded" ? ". Goal reached, so we're placing the order!" : "."}</p>
        ) : <p className="text-lg text-ink-2">Someone finished it just before you. Nothing was kept: your full payment is on its way back to your card.</p>}
        {!!r.refunded && !!r.accepted && <p className="mt-3 rounded-lg bg-haze p-3 text-sm">Only {naira(r.accepted)} was needed to finish it, so we&apos;ve refunded the other <b className="num">{naira(r.refunded)}</b> to your card. Refunds show in 5 to 10 working days.</p>}
        <div className="mt-6"><Share path={`/fund/${p.id}`} text={`I just helped with "${p.title}". Chip in too:`} images={[{ label: "Story picture", href: `/api/v1/share/pool/${p.id}?f=story` }]} /></div>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={`/fund/${p.id}`} className="btn btn-ink">Back to the page</Link><Link href="/fund/new" className="btn btn-ghost">Start your own</Link></div>
      </Shell>
    );
  }

  if (r.kind === "gift_card")
    return (
      <Shell title="Your gift card is ready">
        {r.gift ? (
          <>
            <p className="text-lg text-ink-2">A <b className="num text-ink">{naira(r.gift.amount)}</b> solar gift card{r.gift.toName ? ` for ${r.gift.toName}` : ""}. Share this code. It works at checkout on this site and never expires.</p>
            <p className="font-display num mt-6 select-all rounded-xl bg-haze p-5 text-center text-3xl font-bold tracking-[0.2em]">{r.gift.code}</p>
            {r.emailed ? <p className="mt-3 text-sm text-mute">We&apos;ve also emailed it.</p> : <p className="mt-3 text-sm text-mute">Copy it now and keep it safe. Anyone with the code can spend it.</p>}
          </>
        ) : <p className="text-lg text-ink-2">Payment received. Open this page from the same device you paid on to see the code, or message us on WhatsApp with your receipt.</p>}
        <Actions />
      </Shell>
    );

  const o = r.order;
  return (
    <Shell title="Thank you. We've got your order.">
      <p className="text-lg leading-relaxed text-ink-2">
        Order <b className="text-ink">{o?.ref}</b> for <b className="num text-ink">{naira(r.amount || 0)}</b> is <b className="text-ink">pending</b>.{" "}
        {o?.phone ? <>We&apos;ll call {o.recipient ? <b className="text-ink">{o.recipient.name}</b> : "you"} on <b className="text-ink">{o.phone}</b> shortly to arrange delivery{o.installer ? " and installation" : ""}.</> : "We'll call shortly to arrange delivery."}
      </p>
      {r.emailed && o?.email && <p className="mt-3 text-mute">A copy has been sent to {o.email}.</p>}
      {o?.ref && <GoingSolar refId={o.ref} />}
      <Actions />
    </Shell>
  );
}

function GoingSolar({ refId }: { refId: string }) {
  return (
    <div className="mt-6 rounded-xl border border-line p-4">
      <p className="font-semibold">Tell people you&apos;re going solar</p>
      <p className="mt-1 text-sm text-mute">We made you a picture. Post it on your status; it carries a link to our calculator.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn btn-ghost !py-2 text-sm" href={`/api/v1/share/order/${refId}?f=story`} target="_blank" rel="noopener" download>Story picture</a>
        <a className="btn btn-ghost !py-2 text-sm" href={`/api/v1/share/order/${refId}?f=square`} target="_blank" rel="noopener" download>Square picture</a>
      </div>
    </div>
  );
}

function Actions() {
  return <div className="mt-8 flex flex-wrap gap-3"><Link href="/shop" className="btn btn-ink">Continue shopping</Link><Link href="/account" className="btn btn-ghost">My account</Link></div>;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <div className="rounded-2xl border border-line bg-paper p-6 sm:p-10">
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
