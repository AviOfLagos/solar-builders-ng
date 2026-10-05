"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { recommend, SEGMENTS } from "@/data/packages";
import { naira } from "@/lib/format";
import { STORE } from "@/config/store";
import { KitButton, installedRange } from "./PackageCard";

const APPLIANCES = [
  { key: "bulb", label: "LED bulbs", w: 10, duty: 1 },
  { key: "fan", label: "Fans", w: 70, duty: 1 },
  { key: "laptop", label: "Laptops", w: 65, duty: 1 },
  { key: "monitor", label: "Monitors", w: 30, duty: 1 },
  { key: "router", label: "Wi-Fi router", w: 15, duty: 1 },
  { key: "tv", label: "TV + decoder", w: 120, duty: 1 },
  { key: "fridge", label: "Fridge", w: 150, duty: 0.45, surge: 3 },
  { key: "freezer", label: "Chest freezer", w: 200, duty: 0.5, surge: 3 },
  { key: "pump", label: "Water pump", w: 750, duty: 0.08, surge: 3 },
  { key: "ac", label: "AC (1HP)", w: 900, duty: 0.7, surge: 1.5 },
  { key: "clipper", label: "POS / clippers", w: 30, duty: 1 },
  { key: "dryer", label: "Hair dryer", w: 1200, duty: 0.15 },
] as const;
type Key = (typeof APPLIANCES)[number]["key"];
type Load = Record<Key, number>;

const zero = Object.fromEntries(APPLIANCES.map((a) => [a.key, 0])) as Load;
const PRESETS: Record<string, { label: string; load: Partial<Load>; hours: number }> = {
  students: { label: "Student", load: { bulb: 2, fan: 1, laptop: 1 }, hours: 6 },
  "remote-workers": { label: "Tech bro", load: { bulb: 2, fan: 1, laptop: 1, monitor: 2, router: 1 }, hours: 8 },
  renters: { label: "Renter", load: { bulb: 4, fan: 2, tv: 1, fridge: 1, laptop: 1 }, hours: 8 },
  shops: { label: "Shop / POS", load: { bulb: 3, fan: 1, clipper: 2, tv: 1, freezer: 1 }, hours: 10 },
  families: { label: "Family flat", load: { bulb: 8, fan: 3, tv: 1, fridge: 1, freezer: 1, pump: 1, laptop: 1 }, hours: 10 },
  duplex: { label: "Duplex", load: { bulb: 14, fan: 4, tv: 2, fridge: 1, freezer: 1, pump: 1, ac: 2, router: 1, laptop: 2 }, hours: 12 },
  offices: { label: "Office", load: { bulb: 10, fan: 4, laptop: 8, monitor: 6, router: 1, ac: 1 }, hours: 9 },
};

function size(load: Load, hours: number) {
  let running = 0, energy = 0, surge = 0;
  for (const a of APPLIANCES) {
    const n = load[a.key];
    running += a.w * n;
    energy += a.w * n * a.duty * hours;
    surge = Math.max(surge, n ? a.w * (("surge" in a ? a.surge : 1) - 1) : 0);
  }
  return {
    running,
    kw: Math.max(0.1, Math.round(((running + surge) * 1.25) / 100) / 10),
    kwh: Math.max(0.05, Math.round((energy / 1000 / 0.8) * 10) / 10),
  };
}

export function PowerPlanner() {
  const [preset, setPreset] = useState("remote-workers");
  const [load, setLoad] = useState<Load>({ ...zero, ...PRESETS["remote-workers"].load });
  const [hours, setHours] = useState(PRESETS["remote-workers"].hours);
  const r = useMemo(() => size(load, hours), [load, hours]);
  const picks = useMemo(() => recommend(r.kw, r.kwh, 3, preset), [r.kw, r.kwh, preset]);
  const top = picks[0];
  const range = top ? installedRange(top) : null;
  const empty = r.running === 0;

  const pick = (k: string) => { setPreset(k); setLoad({ ...zero, ...PRESETS[k].load }); setHours(PRESETS[k].hours); };
  const bump = (k: Key, d: number) => { setPreset(""); setLoad((l) => ({ ...l, [k]: Math.max(0, Math.min(30, l[k] + d)) })); };

  return (
    <div id="planner" className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <div className="rounded-2xl bg-paper p-5 text-ink sm:p-6">
        <p className="text-sm font-semibold">1. Start from</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Start from a typical setup">
          {SEGMENTS.map((s) => (
            <button key={s.slug} role="radio" aria-checked={preset === s.slug} onClick={() => pick(s.slug)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${preset === s.slug ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
              {PRESETS[s.slug].label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold">2. Adjust what you’ll run</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APPLIANCES.map((a) => {
            const n = load[a.key];
            return (
              <li key={a.key} className={`flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row sm:items-center sm:pl-3 ${n ? "border-ink bg-mint-tint" : "border-line"}`}>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-sm font-medium sm:truncate">{a.label}</span>
                  <span className="text-[11px] text-mute">{a.w}W each</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <button className="grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-line disabled:opacity-30 sm:h-7 sm:w-7" disabled={!n} aria-label={`Remove ${a.label}`} onClick={() => bump(a.key, -1)}>−</button>
                  <span className="num w-5 text-center text-sm font-bold" aria-live="polite">{n}</span>
                  <button className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white sm:h-7 sm:w-7" aria-label={`Add ${a.label}`} onClick={() => bump(a.key, 1)}>+</button>
                </span>
              </li>
            );
          })}
        </ul>
        <label className="mt-5 block">
          <span className="flex justify-between text-sm font-semibold"><span>3. Hours without light each day</span><span className="num">{hours} hours</span></span>
          <input type="range" min={2} max={24} value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-3 w-full accent-[#17201B]" />
        </label>
      </div>

      <div className="flex flex-col rounded-2xl bg-sun p-5 text-ink sm:p-6" aria-live="polite">
        <p className="text-sm font-semibold">You need</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/60 p-3">
            <p className="font-display num text-4xl font-bold">{r.kw < 1 ? Math.round(r.kw * 1000) : r.kw}<span className="text-xl"> {r.kw < 1 ? "W" : "kW"}</span></p>
            <p className="text-xs leading-snug">inverter — how much runs <b>at the same time</b></p>
          </div>
          <div className="rounded-xl bg-white/60 p-3">
            <p className="font-display num text-4xl font-bold">{r.kwh < 1 ? Math.round(r.kwh * 1000) : r.kwh}<span className="text-xl"> {r.kwh < 1 ? "Wh" : "kWh"}</span></p>
            <p className="text-xs leading-snug">battery — keeps it on for <b>{hours} hours</b></p>
          </div>
        </div>
        {empty ? (
          <p className="mt-6 text-sm">Add at least one appliance to see a kit.</p>
        ) : top ? (
          <div className="mt-5 flex flex-1 flex-col rounded-xl bg-paper p-4">
            <p className="text-xs font-semibold text-mute">Best match · {top.segment.name}</p>
            <div className="mt-1 flex items-start gap-3">
              <span className="relative h-16 w-16 shrink-0 rounded-xl border border-line bg-white"><Image src={top.lines[0].p.image} alt="" fill sizes="64px" className="object-contain p-1" /></span>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold leading-tight">{top.name}</p>
                <p className="text-sm text-ink-2">{top.tagline}</p>
              </div>
            </div>
            <p className="font-display num mt-3 text-3xl font-bold">{naira(top.price)}</p>
            <p className="text-xs text-mute">{range ? <>Installed: <span className="num">{naira(range[0])}–{naira(range[1])}</span></> : "No installation needed"}</p>
            <div className="mt-auto flex gap-2 pt-4">
              <KitButton t={top} className="btn btn-ink flex-1" />
              <Link href={`/packages/${top.segment.slug}#${top.id}`} className="btn btn-ghost">Details</Link>
            </div>
            {picks.length > 1 && (
              <p className="mt-3 text-xs text-mute">
                Also fits: {picks.slice(1).map((t, i) => (
                  <span key={t.id}>{i > 0 && ", "}<Link className="underline" href={`/packages/${t.segment.slug}#${t.id}`}>{t.name} ({naira(t.price)})</Link></span>
                ))}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-paper p-4 text-sm">
            That’s a big load — bigger than our ready kits. <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hi, I need about ${r.kw}kW and ${r.kwh}kWh. Can you quote?`)}`}>Get a custom quote on WhatsApp</a>.
          </div>
        )}
      </div>
    </div>
  );
}
