"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { recommend, SEGMENTS } from "@/data/packages";
import { naira } from "@/lib/format";
import { STORE } from "@/config/store";
import { KitButton, installedRange } from "./PackageCard";
import { APPLIANCES, PRESETS, emptyLoad, sizeLoad as size, type ApplianceKey, type Load } from "@/lib/sizing";

type Key = ApplianceKey;
const zero = emptyLoad;

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
    <div id="planner" className="grid scroll-mt-24 gap-3 lg:grid-cols-[1.35fr_1fr]">
      <div className="card p-5 sm:p-7">
        <Label n={1}>Start from</Label>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Start from a typical setup">
          {SEGMENTS.map((s) => (
            <button key={s.slug} role="radio" aria-checked={preset === s.slug} onClick={() => pick(s.slug)} className="chip">{PRESETS[s.slug].label}</button>
          ))}
        </div>
        <Label n={2} className="mt-7">Adjust what you&apos;ll run</Label>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APPLIANCES.map((a) => {
            const n = load[a.key];
            return (
              <li key={a.key} className={`flex flex-col gap-2 rounded-2xl p-3 transition-colors sm:flex-row sm:items-center ${n ? "bg-mint-tint ring-1 ring-ink/80" : "bg-haze"}`}>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-sm font-semibold sm:truncate">{a.label}</span>
                  <span className="text-[11px] text-mute">{a.w}W each</span>
                </span>
                <span className="flex items-center justify-between gap-1.5">
                  <button className="grid h-8 w-8 place-items-center rounded-xl bg-paper text-lg disabled:opacity-30" disabled={!n} aria-label={`Remove ${a.label}`} onClick={() => bump(a.key, -1)}>−</button>
                  <span className="num w-5 text-center text-sm font-bold" aria-live="polite">{n}</span>
                  <button className="grid h-8 w-8 place-items-center rounded-xl bg-ink text-lg text-white" aria-label={`Add ${a.label}`} onClick={() => bump(a.key, 1)}>+</button>
                </span>
              </li>
            );
          })}
        </ul>
        <label className="mt-7 block">
          <span className="flex items-baseline justify-between"><Label n={3}>Hours without light a day</Label><span className="num text-2xl font-light">{hours}h</span></span>
          <input type="range" min={2} max={24} value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-3 w-full accent-[#17201B]" />
        </label>
      </div>

      <div className="flex flex-col rounded-[2rem] bg-night p-5 text-white sm:p-7" aria-live="polite">
        <p className="text-sm font-semibold text-white/60">You need</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-night-soft p-4">
            <p className="num text-4xl font-light text-mint">{r.kw < 1 ? Math.round(r.kw * 1000) : r.kw}<span className="text-lg"> {r.kw < 1 ? "W" : "kW"}</span></p>
            <p className="mt-1 text-xs leading-snug text-white/60">inverter: what runs <b className="text-white">at once</b></p>
          </div>
          <div className="rounded-2xl bg-night-soft p-4">
            <p className="num text-4xl font-light text-mint">{r.kwh < 1 ? Math.round(r.kwh * 1000) : r.kwh}<span className="text-lg"> {r.kwh < 1 ? "Wh" : "kWh"}</span></p>
            <p className="mt-1 text-xs leading-snug text-white/60">battery: keeps it on <b className="text-white">{hours} hours</b></p>
          </div>
        </div>
        {empty ? (
          <p className="mt-6 text-sm text-white/70">Add at least one appliance to see a kit.</p>
        ) : top ? (
          <div className="mt-3 flex flex-1 flex-col rounded-3xl bg-paper p-5 text-ink">
            <span className="tag self-start">Best match</span>
            <div className="mt-3 flex items-start gap-3">
              <span className="relative h-16 w-16 shrink-0 rounded-2xl bg-haze"><Image src={top.lines[0].p.image} alt="" fill sizes="64px" className="object-contain p-1.5" /></span>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight">{top.name}</p>
                <p className="text-sm text-ink-2">{top.tagline}</p>
              </div>
            </div>
            <p className="num mt-4 text-4xl font-light">{naira(top.price)}</p>
            <p className="text-xs text-mute">{range ? <>Installed: <span className="num">{naira(range[0])}–{naira(range[1])}</span></> : "No installation needed"} · free Lagos delivery</p>
            <div className="mt-auto flex gap-2 pt-5">
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
          <div className="mt-3 rounded-3xl bg-paper p-5 text-sm text-ink">
            That&apos;s a big load, bigger than our ready kits. <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hi, I need about ${r.kw}kW and ${r.kwh}kWh. Can you quote?`)}`}>Get a custom quote on WhatsApp</a>.
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  return <p className={`flex items-center gap-2.5 font-semibold ${className}`}><span className="num grid h-7 w-7 place-items-center rounded-lg bg-mint text-sm">{n}</span>{children}</p>;
}
