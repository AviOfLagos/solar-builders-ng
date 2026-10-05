"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { naira, ngLocal } from "@/lib/format";
import { api, setLeadId } from "@/lib/client";
import { Share } from "@/components/Share";
import { STORE } from "@/config/store";
import { Icon } from "@/components/ui/Icon";

type Result = {
  ok?: boolean; kind?: string; provider?: "paystack" | "stripe"; paymentStatus?: string; amount?: number; emailed?: boolean; error?: string;
  order?: { ref: string; total?: number; giftUsed?: number; phone?: string; email?: string; installer?: boolean; recipient?: { name: string } | null; status: string } | null;
  pool?: { id: string; title: string; goal: number; raised: number; status: string } | null;
  accepted?: number; refunded?: number;
  gift?: { code: string; amount: number; toName: string } | null;
};

function Success() {
  const q = useSearchParams();
  // Stripe sends payment_intent (+ its client secret); Paystack sends reference (and trxref).
  const id = q.get("payment_intent") || q.get("reference") || q.get("trxref");
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
          // Payments can take a few seconds to settle (bank transfers longer); ask again before giving up.
          if (waiting(d) && tries++ < (d.provider === "paystack" ? 12 : 6)) { setTimeout(check, d.provider === "paystack" ? 5000 : 2500); setR(d); return; }
          setR(d);
          if (d.kind === "order" && d.paymentStatus === "succeeded" && d.ok !== false) { clear(); setLeadId(null); }
          // Cancelled or failed on Paystack's page: give back any gift card hold now rather than in an hour.
          if (d.provider === "paystack" && d.kind === "order" && (d.paymentStatus === "canceled" || d.paymentStatus === "failed")) api(`/payments/${encodeURIComponent(id)}/cancel`, { body: {} }).catch(() => {});
        })
        .catch((e) => setR({ error: (e as Error).message }));
    check();
  }, [id, secret, orderRef, clear]);

  if (orderRef)
    return (
      <Shell win title="You're going solar!">
        <p className="text-lg text-ink-2">Order <b className="text-ink">{orderRef}</b> was paid with your gift card.</p>
        <NextSteps />
        <GoingSolar refId={orderRef} />
        <Actions />
      </Shell>
    );
  if (!id) return <Shell title="Nothing to show here"><Link href="/shop" className="btn btn-ink">Continue shopping</Link></Shell>;
  if (!r) return <Shell title="Confirming your payment…"><p className="text-mute">This takes a few seconds. Please don&apos;t close this page.</p></Shell>;
  if (waiting(r))
    return <Shell title="Your bank is still confirming"><p className="text-ink-2">This can take a few minutes, especially for bank transfers. We&apos;ll complete it as soon as the money lands and email you, and you won&apos;t be charged twice. You can close this page.</p><Actions /></Shell>;
  if (r.error || r.paymentStatus !== "succeeded" || r.ok === false)
    return (
      <Shell title={r.paymentStatus === "canceled" ? "Payment cancelled" : "Your payment didn't go through"}>
        <p className="text-ink-2">{r.error || (r.paymentStatus === "canceled" ? "You cancelled before paying. Nothing was charged." : "The payment was not completed. You have not been charged for this attempt.")}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={r.kind === "contribution" && r.pool ? `/fund/${r.pool.id}` : "/checkout"} className="btn btn-ink">Try again</Link><a className="btn btn-ghost" href={`https://wa.me/${STORE.whatsapp}`}>Get help on WhatsApp</a></div>
      </Shell>
    );

  if (r.kind === "contribution" && r.pool) {
    const p = r.pool;
    return (
      <Shell win={!!r.accepted} icon="people" tone="lemon" title={r.accepted ? "Thank you for chipping in!" : "The kit was already funded"}>
        {r.accepted ? (
          <p className="text-lg text-ink-2">You added <b className="num text-ink">{naira(r.accepted)}</b> to <b className="text-ink">{p.title}</b>. It&apos;s now at <b className="num text-ink">{naira(p.raised)}</b> of {naira(p.goal)}{p.status === "funded" ? ". Goal reached, so we're placing the order!" : "."}</p>
        ) : <p className="text-lg text-ink-2">Someone finished it just before you. Nothing was kept: your full payment is on its way back to you.</p>}
        {!!r.refunded && !!r.accepted && <p className="mt-3 rounded-xl bg-haze p-3 text-sm">Only {naira(r.accepted)} was needed to finish it, so we&apos;ve refunded the other <b className="num">{naira(r.refunded)}</b> to the card or account you paid from. Refunds can take 5 to 10 working days to show.</p>}
        {!!r.accepted && <div className="mt-6"><Share path={`/fund/${p.id}`} text={`I just helped with "${p.title}". Chip in too:`} images={[{ label: "Story picture", href: `/api/v1/share/pool/${p.id}?f=story` }]} /></div>}
        <div className="mt-6 flex flex-wrap gap-3"><Link href={`/fund/${p.id}`} className="btn btn-ink">Back to the page</Link><Link href="/fund/new" className="btn btn-ghost">Start your own</Link></div>
      </Shell>
    );
  }

  if (r.kind === "gift_card")
    return (
      <Shell win icon="gift" tone="lemon" title="Your gift card is ready">
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
    <Shell win title={o?.recipient ? `${o.recipient.name} is going solar!` : "You're going solar!"}>
      <p className="text-lg leading-relaxed text-ink-2">
        Order <b className="text-ink">{o?.ref}</b> · <b className="num text-ink">{naira(o?.total ?? r.amount ?? 0)}</b>{o?.giftUsed ? ` (${naira(o.giftUsed)} on your gift card)` : ""}.{" "}
        {o?.phone ? <>We&apos;ll call {o.recipient ? <b className="text-ink">{o.recipient.name}</b> : "you"} on <b className="text-ink">{ngLocal(o.phone)}</b>.</> : null}
      </p>
      <NextSteps installer={o?.installer} who={o?.recipient?.name} />
      {r.emailed && o?.email && <p className="mt-3 text-mute">A copy has been sent to {o.email}.</p>}
      {o?.ref && <GoingSolar refId={o.ref} />}
      <Actions />
    </Shell>
  );
}

/** Still settling: Stripe "processing", or a Paystack transfer the bank hasn't confirmed yet. */
const waiting = (r: Result) => r.paymentStatus === "processing" || (r.provider === "paystack" && r.paymentStatus === "pending");

function GoingSolar({ refId }: { refId: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-line p-5">
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
  return <div className="mt-8 flex flex-wrap gap-3"><Link href="/account" className="btn btn-ink">Track my order</Link><Link href="/" className="btn btn-ghost">Back home</Link></div>;
}

/** A short, calm "done" moment: only for real wins (paid, chipped in, gift card ready). */
function Celebrate({ icon = "check", tone = "mint" }: { icon?: string; tone?: "mint" | "lemon" }) {
  return (
    <div className="relative mb-6 grid h-28 w-28 place-items-center" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`rise absolute h-4 w-1.5 rounded-full ${tone === "mint" ? "bg-mint" : "bg-lemon"}`} style={{ transform: `rotate(${i * 45}deg) translateY(-54px)`, animationDelay: `${0.25 + i * 0.03}s` }} />
      ))}
      <span className={`pop grid h-20 w-20 place-items-center rounded-full ${tone === "mint" ? "bg-mint" : "bg-lemon"}`}><Icon name={icon} size={38} stroke={2.4} /></span>
    </div>
  );
}

/** "What happens next": the order's road from paid to lights on. */
function NextSteps({ installer, who }: { installer?: boolean; who?: string }) {
  const steps = [
    ["Paid", "Done. Your receipt is on its way.", true],
    ["We call to confirm", `Usually within a few hours${who ? `, on ${who}'s number` : ""}.`, false],
    ["Delivery in Lagos", "Free. We agree a day that works.", false],
    ...(installer ? [["Installation", "Our engineer sets it up and shows how it works.", false]] : []),
    ["Lights on", "No more fuel runs.", false],
  ] as [string, string, boolean][];
  return (
    <ol className="mt-6 rounded-3xl bg-haze p-5">
      {steps.map(([t, d, done], i) => (
        <li key={t} className="flex gap-3">
          <span className="flex flex-col items-center">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-sun-deep text-white" : "bg-paper text-mute"}`}>{done ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>
            {i < steps.length - 1 && <span className="min-h-5 w-0.5 flex-1 bg-line" />}
          </span>
          <span className="pb-4"><span className="block font-semibold">{t}</span><span className="text-sm text-ink-2">{d}</span></span>
        </li>
      ))}
    </ol>
  );
}

function Shell({ title, children, win, icon, tone }: { title: string; children: React.ReactNode; win?: boolean; icon?: string; tone?: "mint" | "lemon" }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <div className="rounded-[2rem] bg-paper p-6 sm:p-10">
        {win ? <Celebrate icon={icon} tone={tone} /> : <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-haze" aria-hidden><Icon name="sun" /></div>}
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Success /></Suspense>;
}
