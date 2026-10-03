"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ALL_TIERS } from "@/data/packages";
import { naira } from "@/lib/format";

const OPTIONS = ALL_TIERS.filter((t) => t.price > 300_000 && t.price < 8_000_000);

export function FuelVsSolar() {
  const [weekly, setWeekly] = useState(25_000);
  const [id, setId] = useState(OPTIONS.find((t) => t.id === "work-from-home")?.id ?? OPTIONS[0].id);
  const t = OPTIONS.find((x) => x.id === id)!;
  const r = useMemo(() => {
    const cost = t.price + (t.install[0] + t.install[1]) / 2;
    const monthly = weekly * 4.33;
    return { cost, monthly, months: Math.ceil(cost / monthly), year: monthly * 12 };
  }, [weekly, t]);
  return (
    <div className="grid gap-6 rounded-2xl bg-ink p-6 text-white sm:p-10 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Petrol vs solar</h2>
        <p className="mt-2 text-white/70">How long until your kit pays for itself with the money you stop spending on fuel.</p>
        <label className="mt-6 block">
          <span className="flex justify-between text-sm"><span>What you spend on petrol/diesel each week</span><span className="num font-semibold text-sun">{naira(weekly)}</span></span>
          <input type="range" min={5000} max={200000} step={2500} value={weekly} onChange={(e) => setWeekly(+e.target.value)} className="mt-3 w-full accent-[#FFC21A]" />
        </label>
        <label className="mt-5 block text-sm">
          <span>Kit</span>
          <select value={id} onChange={(e) => setId(e.target.value)} className="field mt-2">
            {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.segment.short}: {o.name} — {naira(o.price)}</option>)}
          </select>
        </label>
      </div>
      <div className="grid content-center gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/10 p-5"><p className="text-sm text-white/70">Fuel you burn in a year</p><p className="font-display num mt-1 text-3xl font-bold">{naira(r.year)}</p></div>
        <div className="rounded-xl bg-white/10 p-5"><p className="text-sm text-white/70">Kit + typical installation</p><p className="font-display num mt-1 text-3xl font-bold">{naira(r.cost)}</p></div>
        <div className="rounded-xl bg-sun p-5 text-ink sm:col-span-2">
          <p className="text-sm">Pays for itself in about</p>
          <p className="font-display num text-5xl font-bold">{r.months} {r.months === 1 ? "month" : "months"}</p>
          <Link href={`/packages/${t.segment.slug}#${t.id}`} className="mt-2 inline-block text-sm font-semibold underline">See the {t.name} kit</Link>
        </div>
      </div>
    </div>
  );
}
