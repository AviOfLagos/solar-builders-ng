"use client";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flow, Next } from "@/components/ui/Flow";
import { Icon } from "@/components/ui/Icon";
import { SEGMENTS, recommend, type ResolvedTier } from "@/data/packages";
import { APPLIANCES, PRESETS, emptyLoad, encodeItems, fuelPerMonth, sizeLoad, type Load } from "@/lib/sizing";
import { naira } from "@/lib/format";
import { useJourney } from "@/lib/journey";
import { STORE } from "@/config/store";

const SEG_ICON: Record<string, string> = {
  students: "sparkle", "remote-workers": "bolt", renters: "home", shops: "card", families: "people", duplex: "home", offices: "grid",
};
const HOURS: [number, string][] = [[4, "A few hours"], [6, "Half the day"], [8, "Most evenings"], [10, "Most of the day"], [12, "Day and night"], [16, "Almost always"]];

const kitHref = (t: ResolvedTier, who: string) =>
  `/kit?items=${encodeURIComponent(encodeItems(t.lines.map((l) => ({ id: l.p.id, qty: l.qty }))))}&name=${encodeURIComponent(t.name)}&who=${who}`;

/**
 * Find your kit, one question at a time (same as the app):
 * 1. what should it run (a preset, or appliances one by one)
 * 2. hours without light
 * 3. the match, with what it saves
 * Answers are remembered, so coming back resumes where they left off.
 */
function Find() {
  const router = useRouter();
  const q = useSearchParams();
  const who = q.get("who") === "someone" ? "someone" : "me";
  const { finder, setFinder } = useJourney();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [picking, setPicking] = useState(false);
  const load = useMemo(() => ({ ...emptyLoad, ...finder.load }) as Load, [finder.load]);
  const size = useMemo(() => sizeLoad(load, finder.hours), [load, finder.hours]);
  const picks = useMemo(() => (size.running > 0 ? recommend(size.kw, size.kwh, 3, finder.segment ?? undefined) : []), [size, finder.segment]);
  const fuel = fuelPerMonth(size.kw, finder.hours);

  const pick = (slug: string) => {
    if (slug === "custom") { setFinder({ segment: "custom" }); setPicking(true); return; }
    setFinder({ segment: slug, load: { ...PRESETS[slug]?.load }, hours: PRESETS[slug]?.hours ?? 8 });
    setStep(2);
  };
  const back = () => (picking ? setPicking(false) : step > 1 ? setStep((s) => (s - 1) as 1 | 2) : router.back());

  if (step === 1 && !picking)
    return (
      <Flow step={1} total={3} onBack={back} title={who === "someone" ? "What should their solar keep running?" : "What should it keep running?"} sub="Pick the closest match.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...SEGMENTS.map((s) => ({ key: s.slug, title: s.short, icon: SEG_ICON[s.slug] ?? "sun" })), { key: "custom", title: "I'll pick appliances", icon: "options" }].map((o) => {
            const on = finder.segment === o.key;
            return (
              <button key={o.key} onClick={() => pick(o.key)} role="radio" aria-checked={on}
                className={`flex min-h-[124px] flex-col justify-between rounded-3xl p-4 text-left transition-transform active:scale-[.98] ${on ? "bg-night text-white" : "bg-paper hover:shadow-[0_8px_24px_rgba(23,32,27,0.08)]"}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${on ? "bg-mint text-ink" : "bg-haze"}`}><Icon name={o.icon} size={21} /></span>
                <span className="font-bold leading-snug">{o.title}</span>
              </button>
            );
          })}
        </div>
        {finder.segment && finder.segment !== "custom" && <p className="text-sm text-ink-2">{SEGMENTS.find((s) => s.slug === finder.segment)?.who}</p>}
      </Flow>
    );

  if (step === 1 && picking)
    return (
      <Flow step={1} total={3} onBack={back} title="What will you run?" sub="Count what should work when there's no light."
        footer={<Next disabled={size.running === 0} onClick={() => { setPicking(false); setStep(2); }}>Next: hours without light</Next>}>
        <div className="card divide-y divide-line px-5">
          {APPLIANCES.map((a) => {
            const n = load[a.key];
            const set = (v: number) => setFinder({ load: { ...load, [a.key]: Math.max(0, Math.min(30, v)) } });
            return (
              <div key={a.key} className="flex items-center justify-between gap-3 py-3">
                <span><span className="block font-semibold">{a.label}</span><span className="text-xs text-mute">{a.w}W each</span></span>
                <span className="flex items-center gap-2">
                  <button onClick={() => set(n - 1)} disabled={!n} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-lg disabled:opacity-40" aria-label={`Fewer ${a.label}`}>−</button>
                  <span className="num w-7 text-center font-bold">{n}</span>
                  <button onClick={() => set(n + 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lg text-white" aria-label={`More ${a.label}`}>+</button>
                </span>
              </div>
            );
          })}
        </div>
      </Flow>
    );

  if (step === 2)
    return (
      <Flow step={2} total={3} onBack={back} title="How long is light usually off?" sub="In a normal day. We'll size the batteries for it."
        footer={<Next icon="sparkle" onClick={() => setStep(3)}>See my kit</Next>}>
        <div className="grid grid-cols-3 gap-3">
          {HOURS.map(([h, label]) => {
            const on = finder.hours === h;
            return (
              <button key={h} onClick={() => setFinder({ hours: h })} role="radio" aria-checked={on}
                className={`rounded-3xl px-2 py-5 text-center transition-transform active:scale-[.98] ${on ? "bg-night text-white" : "bg-paper"}`}>
                <span className={`block text-4xl font-light ${on ? "text-mint" : ""}`}>{h}h</span>
                <span className={`mt-1 block text-xs font-semibold ${on ? "text-white/80" : "text-mute"}`}>{label}</span>
              </button>
            );
          })}
        </div>
        {size.running > 0 && (
          <div className="rounded-3xl bg-lemon-tint p-5">
            <p className="text-sm font-semibold text-ink-2">On a generator, that&apos;s about</p>
            <p className="num mt-1 text-4xl font-light">{naira(fuel)}<span className="text-base"> a month</span></p>
            <p className="mt-1 text-sm text-ink-2">in fuel alone. Solar pays that back.</p>
          </div>
        )}
      </Flow>
    );

  const [best, ...others] = picks;
  if (!best)
    return (
      <Flow step={3} total={3} onBack={back} label="Done" title="That's a big setup." sub="It's more than our ready kits cover. Chat with us and we'll size a custom system with a full price.">
        <a className="btn btn-ink w-full" href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent("Hi, I need a custom solar system")}`} target="_blank" rel="noopener">Chat on WhatsApp</a>
      </Flow>
    );
  const install = best.install[1] === 0 ? null : [best.price + best.install[0], best.price + best.install[1]];
  return (
    <Flow step={3} total={3} onBack={back} label="Done" title={<><span className="tag mb-3 align-middle">Your match</span><br />{best.name}</>} sub={best.tagline}
      footer={<Link href={kitHref(best, who)} className="btn btn-ink w-full !py-4 text-base">Choose this kit<Icon name="arrow" size={18} /></Link>}
      aside={
        <div className="sticky top-6 space-y-3">
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-2">What&apos;s in the box</p>
            <ul className="mt-3 space-y-3">
              {best.lines.map((l) => (
                <li key={l.p.id} className="flex items-center gap-3">
                  <span className="relative h-14 w-14 shrink-0 rounded-2xl bg-haze"><Image src={l.p.image} alt="" fill sizes="56px" className="object-contain p-1.5" /></span>
                  <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-2 font-semibold">{l.p.name}</span><span className="text-mute">Qty {l.qty}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }>
      <div className="space-y-4 rounded-[2rem] bg-night p-6 text-white">
        <div>
          <p className="text-sm text-white/60">Kit price</p>
          <p className="num text-5xl font-light tracking-tight">{naira(best.price)}</p>
          <p className="mt-1 text-sm text-white/60">{install ? `About ${naira(install[0])} – ${naira(install[1])} installed` : "No installation needed"} · free Lagos delivery</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-night-soft p-4"><p className="text-2xl font-light text-mint">{best.kw} kW</p><p className="text-xs text-white/60">power at once</p></div>
          <div className="rounded-2xl bg-night-soft p-4"><p className="text-2xl font-light text-mint">{best.kwh} kWh</p><p className="text-xs text-white/60">stored for the night</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-mint p-4 text-ink"><Icon name="bolt" /><span className="font-semibold">Saves about {naira(fuel)} a month on fuel</span></div>
      </div>
      <div className="card p-5">
        <p className="text-sm font-semibold text-ink-2">Keeps these running</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">{best.powers.map((p) => <li key={p} className="flex items-center gap-2"><Icon name="check" size={18} className="text-sun-deep" stroke={2.4} />{p}</li>)}</ul>
      </div>
      {others.length > 0 && (
        <>
          <p className="pt-2 text-lg font-semibold">Other sizes</p>
          {others.map((t) => (
            <Link key={t.id} href={kitHref(t, who)} className="card flex items-center gap-4 p-4 hover:shadow-[0_8px_24px_rgba(23,32,27,0.08)]">
              <span className="flex-1"><span className="block font-bold">{t.name}</span><span className="text-sm text-mute">{t.kw} kW · {t.kwh} kWh</span></span>
              <span className="num font-bold">{naira(t.price)}</span><Icon name="chevron" size={18} className="text-mute" />
            </Link>
          ))}
        </>
      )}
      <button onClick={() => setStep(1)} className="w-full pt-2 text-center text-sm text-mute underline">Start over</button>
    </Flow>
  );
}

export default function Page() {
  return <Suspense><Find /></Suspense>;
}
