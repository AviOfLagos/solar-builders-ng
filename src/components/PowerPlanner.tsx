"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { products, capacity, brandName } from "@/lib/catalog";
import { naira } from "@/lib/format";

const APPLIANCES = [
  { key: "bulb", label: "LED bulbs", w: 10, duty: 1, start: 6 },
  { key: "fan", label: "Fans", w: 70, duty: 1, start: 2 },
  { key: "tv", label: "TV + decoder", w: 120, duty: 1, start: 1 },
  { key: "fridge", label: "Fridge", w: 150, duty: 0.45, start: 1, surge: 3 },
  { key: "freezer", label: "Chest freezer", w: 200, duty: 0.5, start: 0, surge: 3 },
  { key: "laptop", label: "Laptops", w: 65, duty: 1, start: 1 },
  { key: "router", label: "Wi-Fi router", w: 15, duty: 1, start: 1 },
  { key: "ac1", label: "1HP air conditioner", w: 900, duty: 0.7, start: 0, surge: 2.5 },
  { key: "pump", label: "Water pump", w: 750, duty: 0.08, start: 0, surge: 3 },
] as const;

type Key = (typeof APPLIANCES)[number]["key"];

export function PowerPlanner() {
  const [qty, setQty] = useState<Record<Key, number>>(() => Object.fromEntries(APPLIANCES.map((a) => [a.key, a.start])) as Record<Key, number>);
  const [hours, setHours] = useState(8);

  const r = useMemo(() => {
    let running = 0, energy = 0, surge = 0;
    for (const a of APPLIANCES) {
      const n = qty[a.key];
      running += a.w * n;
      energy += a.w * n * a.duty * hours;
      surge = Math.max(surge, n ? a.w * (("surge" in a ? a.surge : 1) - 1) : 0);
    }
    const kw = Math.max(1, Math.ceil(((running + surge) * 1.25) / 1000));
    const kwh = Math.max(0.3, Math.round((energy / 1000 / 0.8) * 10) / 10);
    const picks = products
      .filter((p) => ["complete-systems", "power-stations"].includes(p.category))
      .map((p) => ({ p, c: capacity(p) }))
      .filter(({ c }) => (c.kwh ?? 0) >= kwh && (c.kw ?? 0) >= kw * 0.8)
      .sort((a, b) => a.p.price - b.p.price)
      .slice(0, 3);
    return { running, kw, kwh, picks };
  }, [qty, hours]);

  const cells = 10;
  const filled = Math.min(cells, Math.max(1, Math.round((r.kwh / 30) * cells)));

  return (
    <div id="planner" className="rounded-2xl bg-paper p-5 text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,.5)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">What do you want to power?</h2>
          <p className="text-sm text-mute">Tap to add appliances. We'll size the system.</p>
        </div>
        <div className="flex h-14 w-28 shrink-0 items-center gap-[3px] rounded-md border-2 border-ink p-[3px]" role="img" aria-label={`About ${r.kwh} kWh of storage needed`}>
          {Array.from({ length: cells }).map((_, i) => (
            <span key={i} className={`cell h-full flex-1 rounded-[2px] ${i < filled ? (filled > 7 ? "bg-flare" : filled > 4 ? "bg-sun" : "bg-leaf") : "bg-haze"}`} />
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {APPLIANCES.map((a) => {
          const n = qty[a.key];
          return (
            <li key={a.key} className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-sm ${n ? "border-ink bg-sun/15" : "border-line"}`}>
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => setQty((q) => ({ ...q, [a.key]: q[a.key] + 1 }))} aria-label={`Add ${a.label}`}>
                {a.label}
              </button>
              <span className="flex items-center gap-1">
                {n > 0 && <button className="h-6 w-6 rounded-full bg-white text-xs ring-1 ring-line" aria-label={`Remove one ${a.label}`} onClick={() => setQty((q) => ({ ...q, [a.key]: Math.max(0, q[a.key] - 1) }))}>−</button>}
                <span className="num w-4 text-center font-semibold">{n}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <label className="mt-5 block text-sm">
        <span className="flex justify-between"><span>Backup hours per day</span><span className="num font-semibold">{hours} h</span></span>
        <input type="range" min={2} max={24} value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-2 w-full accent-[#10213B]" />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-haze p-4">
        <div><p className="text-xs text-mute">Inverter size</p><p className="font-display num text-2xl font-semibold">{r.kw} kW</p></div>
        <div><p className="text-xs text-mute">Battery storage</p><p className="font-display num text-2xl font-semibold">{r.kwh} kWh</p></div>
      </div>
      <div className="mt-4">
        {r.picks.length ? (
          <ul className="space-y-2">
            {r.picks.map(({ p }) => (
              <li key={p.id}>
                <Link href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-2 hover:border-ink">
                  <span className="relative h-12 w-12 shrink-0"><Image src={p.image} alt="" fill sizes="48px" className="object-contain" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs text-mute">{brandName(p.brand)}</span><span className="line-clamp-1 text-sm font-medium">{p.name}</span></span>
                  <span className="num shrink-0 text-sm font-semibold">{naira(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">That's a big load. Browse <Link className="underline" href="/category/complete-systems">complete systems</Link> or ask us on WhatsApp for a custom quote.</p>
        )}
      </div>
    </div>
  );
}
