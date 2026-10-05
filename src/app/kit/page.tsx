"use client";
import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flow } from "@/components/ui/Flow";
import { Icon } from "@/components/ui/Icon";
import { getProductById } from "@/lib/catalog";
import { decodeItems } from "@/lib/sizing";
import { naira } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/client";
import { PATH_ORDER, useJourney, type PayPath } from "@/lib/journey";
import { FINANCE, STORE } from "@/config/store";

type Path = { icon: string; title: string; sub: string; go: () => void; hide?: boolean };

/**
 * "How would you like to pay?" One suggested way (from the visitor's role, or who the kit is for),
 * two more, and the rest behind "More ways to pay" (docs/DESIGN.md rule 2).
 */
function Kit() {
  const router = useRouter();
  const q = useSearchParams();
  const items = useMemo(() => decodeItems(q.get("items")), [q]);
  const name = q.get("name") || "Your kit";
  const who = q.get("who");
  const role = useJourney((s) => s.role) ?? "home";
  const { addMany, replace, setOpen } = useCart();
  const [more, setMore] = useState(false);
  const [inside, setInside] = useState(false);
  const [share, setShare] = useState<{ state: "idle" | "busy" | "done"; url?: string; err?: string }>({ state: "idle" });

  const lines = items.map((i) => ({ ...i, p: getProductById(i.id) })).filter((l) => l.p) as { id: string; qty: number; p: NonNullable<ReturnType<typeof getProductById>> }[];
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  if (!lines.length)
    return (
      <Flow step={1} total={1} onBack={() => router.back()} label="" title="This kit isn't available any more." sub="Prices and stock change. Find a fresh match in three quick questions.">
        <button className="btn btn-ink w-full" onClick={() => router.push("/find")}>Find my kit</button>
      </Flow>
    );

  const toCart = (mode: "add" | "only") => { if (mode === "add") addMany(items); else replace(items); setOpen(false); };
  const shareList = async () => {
    setShare({ state: "busy" });
    try {
      const r = await api<{ path: string }>("/builds", { body: { items, title: name } });
      const url = new URL(r.path, STORE.url).toString();
      await navigator.clipboard.writeText(url).catch(() => {});
      setShare({ state: "done", url });
    } catch (e) { setShare({ state: "idle", err: (e as Error).message }); }
  };

  const all: Record<PayPath, Path> = {
    share: { icon: "share", title: "Send it to a client", sub: "Get a link. They see today's prices and pay any way they like.", go: shareList },
    now: { icon: "card", title: "Pay now", sub: "Card, bank transfer or USSD. Cards from abroad work too.", go: () => { toCart("add"); router.push("/checkout"); } },
    someone: { icon: "gift", title: "Buy it for someone", sub: "We deliver to them in Lagos. Pay from anywhere.", go: () => { toCart("add"); router.push("/checkout?for=someone"); } },
    fund: { icon: "megaphone", title: "Let people chip in", sub: "A Go Solar Me page. It orders itself at 100%.", go: () => { toCart("only"); router.push("/fund/new"); } },
    squad: { icon: "split", title: "Split with your squad", sub: "2–10 people, equal shares, a pay button each.", go: () => { toCart("only"); router.push("/fund/new?kind=squad"); } },
    gift: { icon: "ticket", title: "Give a gift card", sub: "They spend it on this kit or anything else.", go: () => router.push(`/gift-cards?amount=${subtotal}`) },
    small: { icon: "calendar", title: "Pay small small", sub: "30–50% now, the rest over 3 to 12 months.", go: () => { toCart("only"); router.push("/pay-small-small"); }, hide: subtotal < FINANCE.minTotal },
  };
  const order = [...PATH_ORDER[role]];
  const bump = (k: PayPath) => { order.splice(order.indexOf(k), 1); order.unshift(k); };
  if (who === "us") bump("squad");
  if (who === "someone") bump("someone");
  const paths = order.map((k) => all[k]).filter((p) => !p.hide);
  const [first, ...rest] = paths;
  const shown = rest.slice(0, 2);
  const hidden = rest.slice(2);

  return (
    <Flow step={1} total={1} onBack={() => router.back()} label={`${name} · ${count} item${count === 1 ? "" : "s"}`}
      title={<>How would you like to <span className="hl">pay</span>?</>}
      aside={
        <div className="card sticky top-6 p-5">
          <p className="text-sm font-semibold text-ink-2">{name}</p>
          <p className="num mt-1 text-4xl font-light">{naira(subtotal)}</p>
          <p className="text-sm text-mute">Free delivery in Lagos</p>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 rounded-xl bg-haze"><Image src={l.p.image} alt="" fill sizes="48px" className="object-contain p-1" /></span>
                <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-1 font-semibold">{l.p.name}</span><span className="text-mute">Qty {l.qty}</span></span>
                <span className="num text-sm font-semibold">{naira(l.p.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      }>
      <div className="lg:hidden">
        <p className="num text-4xl font-light">{naira(subtotal)}</p>
        <button onClick={() => setInside(!inside)} className="mt-1 flex items-center gap-1 text-sm font-semibold">{inside ? "Hide" : "See"} what&apos;s inside<Icon name="down" size={16} className={inside ? "rotate-180" : ""} /></button>
        {inside && (
          <ul className="card mt-3 space-y-2 p-4 text-sm">
            {lines.map((l) => <li key={l.id} className="flex justify-between gap-3"><span className="line-clamp-1">{l.qty} × {l.p.name}</span><span className="num shrink-0">{naira(l.p.price * l.qty)}</span></li>)}
          </ul>
        )}
      </div>

      <button onClick={first.go} disabled={share.state === "busy"} className="block w-full space-y-4 rounded-[2rem] bg-night p-6 text-left text-white transition-transform active:scale-[.99]">
        <span className="flex items-center justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-ink"><Icon name={first.icon} /></span>
          <span className="tag">Suggested for you</span>
        </span>
        <span className="block"><span className="block text-xl font-bold">{first.title}</span><span className="mt-1 block text-sm text-white/65">{first.sub}</span></span>
        <span className="flex items-center justify-end gap-1.5 font-bold text-mint">{share.state === "busy" ? "One moment…" : "Continue"}<Icon name="arrow" size={18} /></span>
      </button>

      {share.state === "done" && (
        <div className="card space-y-3 p-5">
          <p className="font-semibold">Link copied</p>
          <p className="break-all rounded-xl bg-haze p-3 text-sm">{share.url}</p>
          <a className="btn btn-ink w-full" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`${name}: here's the solar equipment list, with today's prices. ${share.url}`)}`}>Send on WhatsApp</a>
        </div>
      )}
      {share.err && <p role="alert" className="text-sm text-flare">{share.err}</p>}

      {[...shown, ...(more ? hidden : [])].map((p) => (
        <button key={p.title} onClick={p.go} className="flex w-full items-center gap-4 rounded-3xl bg-paper p-4 text-left hover:shadow-[0_8px_24px_rgba(23,32,27,0.07)]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-haze"><Icon name={p.icon} /></span>
          <span className="flex-1"><span className="block font-bold">{p.title}</span><span className="block text-sm text-ink-2">{p.sub}</span></span>
          <Icon name="chevron" size={18} className="text-mute" />
        </button>
      ))}
      {hidden.length > 0 && !more && (
        <button onClick={() => setMore(true)} className="w-full py-2 text-center font-semibold underline underline-offset-4">More ways to pay ({hidden.length})</button>
      )}
    </Flow>
  );
}

export default function Page() {
  return <Suspense><Kit /></Suspense>;
}
