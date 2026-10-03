"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";
import type { ResolvedTier } from "@/data/packages";

export function KitButton({ t, className = "btn btn-sun w-full" }: { t: ResolvedTier; className?: string }) {
  const addMany = useCart((s) => s.addMany);
  return (
    <button className={className} onClick={() => addMany(t.lines.map((l) => ({ id: l.p.id, qty: l.qty })))}>
      Add kit to cart
    </button>
  );
}

export function installedRange(t: ResolvedTier) {
  return t.install[1] === 0 ? null : [t.price + t.install[0], t.price + t.install[1]] as const;
}

export function PackageCard({ t, showSegment = false }: { t: ResolvedTier; showSegment?: boolean }) {
  const range = installedRange(t);
  return (
    <article id={t.id} className={`relative flex flex-col rounded-2xl border bg-paper p-5 ${t.best ? "border-ink ring-2 ring-sun" : "border-line"}`}>
      {t.best && <span className="absolute -top-3 left-5 rounded-full bg-sun px-3 py-1 text-xs font-bold">Most picked</span>}
      {showSegment && <Link href={`/packages/${t.segment.slug}`} className="text-xs font-semibold text-mute hover:underline">{t.segment.name}</Link>}
      <h3 className="font-display text-2xl font-bold">{t.name}</h3>
      <p className="mt-1 text-sm text-ink-2">{t.tagline}</p>
      <div className="mt-4 flex gap-2">
        {t.lines.slice(0, 3).map((l) => (
          <div key={l.p.id} className="relative h-16 w-16 rounded-lg border border-line bg-white">
            <Image src={l.p.image} alt="" fill sizes="64px" className="object-contain p-1" />
            {l.qty > 1 && <span className="num absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">×{l.qty}</span>}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold text-mute">Powers</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {t.powers.map((x) => <li key={x} className="rounded-full bg-haze px-2.5 py-1 text-xs">{x}</li>)}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-mute">What’s in the box</summary>
        <ul className="mt-2 space-y-1">
          {t.lines.map((l) => (
            <li key={l.p.id} className="flex justify-between gap-3"><Link href={`/product/${l.p.slug}`} className="line-clamp-1 hover:underline">{l.qty} × {l.p.name}</Link><span className="num shrink-0">{naira(l.p.price * l.qty)}</span></li>
          ))}
        </ul>
      </details>
      <div className="mt-auto pt-5">
        <p className="font-display num text-3xl font-bold">{naira(t.price)}</p>
        <p className="mt-1 text-xs text-mute">
          {range ? <>Typical installed total in Lagos: <span className="num font-semibold text-ink">{naira(range[0])}–{naira(range[1])}</span></> : "No installation needed. Plug in and go."}
        </p>
        <div className="mt-4"><KitButton t={t} /></div>
      </div>
    </article>
  );
}
