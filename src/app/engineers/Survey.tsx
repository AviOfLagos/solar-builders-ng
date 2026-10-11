"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { REGIONS } from "@/config/store";
import { SURVEY, YEARS, JOBS_PER_MONTH } from "@/data/engineer-survey";

type Sample = { name: string; kw: number; kwh: number; price: number; install: [number, number]; powers: string[]; items: { name: string; qty: number; price: number }[] };

export function Survey({ sample }: { sample: Sample }) {
  const [me, setMe] = useState({ name: "", phone: "", region: "", years: "", jobsPerMonth: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [join, setJoin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const answered = Object.values(answers).filter((v) => v.trim()).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api("/engineer-survey", { body: { ...me, answers, joinList: join } }); setDone(true); window.scrollTo({ top: 0 }); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };

  if (done)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Thank you.</h1>
        <p className="mt-3 text-lg text-ink-2">Your answers go straight into how we size and quote systems.{join ? " We'll message you on WhatsApp before we send any jobs." : ""}</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-sun-deep">For solar installers in Lagos</p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Help us send you quotes you don&apos;t have to fix.</h1>
        <p className="text-lg text-ink-2">We size and price solar systems for homes and shops, then hand the install to an engineer. Tell us what a quote must contain so you never have to call the customer to ask. About 5 minutes; answer what you can.</p>
      </header>

      <section className="card space-y-4 p-5">
        <p className="font-semibold">About you</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="mb-1.5 block font-medium">Name</span><input id="s-name" className="field" required value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} autoComplete="name" /></label>
          <label className="block text-sm"><span className="mb-1.5 block font-medium">WhatsApp number</span><input id="s-phone" className="field" required inputMode="tel" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} placeholder="0803 123 4567" autoComplete="tel" /></label>
          <label className="block text-sm"><span className="mb-1.5 block font-medium">Where you mostly work</span><select id="s-region" className="field" value={me.region} onChange={(e) => setMe({ ...me, region: e.target.value })}><option value="">Choose…</option>{REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1.5 block font-medium">Years installing solar</span><select id="s-years" className="field" value={me.years} onChange={(e) => setMe({ ...me, years: e.target.value })}><option value="">Choose…</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="block text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">Installs you do in a month</span><select id="s-jobs" className="field" value={me.jobsPerMonth} onChange={(e) => setMe({ ...me, jobsPerMonth: e.target.value })}><option value="">Choose…</option>{JOBS_PER_MONTH.map((y) => <option key={y}>{y}</option>)}</select></label>
        </div>
      </section>

      <section className="rounded-3xl bg-night p-5 text-white">
        <p className="text-sm text-white/60">Sample quote from our calculator · family flat</p>
        <p className="mt-1 text-2xl font-semibold">{sample.name}</p>
        <p className="text-sm text-white/70">{sample.kw} kW inverter · {sample.kwh} kWh battery · runs {sample.powers.join(", ").toLowerCase()}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {sample.items.map((i) => <li key={i.name} className="flex justify-between gap-3"><span className="min-w-0">{i.qty}× {i.name}</span><span className="num shrink-0">{naira(i.price * i.qty)}</span></li>)}
        </ul>
        <div className="mt-4 flex justify-between border-t border-white/15 pt-3 text-sm"><span>Equipment</span><span className="num font-semibold">{naira(sample.price)}</span></div>
        {sample.install[1] > 0 && <div className="flex justify-between text-sm text-white/70"><span>Installation (our estimate)</span><span className="num">{naira(sample.install[0])} – {naira(sample.install[1])}</span></div>}
      </section>

      {SURVEY.map((s) => (
        <section key={s.title} className="space-y-5">
          <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
          {s.questions.map((q) => (
            <div key={q.key} className="space-y-2">
              <label htmlFor={`q-${q.key}`} className="block font-medium">{q.q}</label>
              {q.hint && <p className="text-sm text-mute">{q.hint}</p>}
              {q.choices ? (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q.q}>
                  {q.choices.map((c) => <button type="button" key={c} role="radio" aria-checked={answers[q.key] === c} className="chip" onClick={() => setAnswers({ ...answers, [q.key]: c })}>{c}</button>)}
                </div>
              ) : (
                <textarea id={`q-${q.key}`} rows={3} className="field" value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
              )}
            </div>
          ))}
        </section>
      ))}

      <section className="card space-y-4 p-5">
        <label className="flex items-start gap-2 text-sm"><input id="s-join" type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} className="mt-0.5" />Add me to your installer list. Message me on WhatsApp when there&apos;s a job in my area.</label>
        {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
        <button disabled={busy || answered < 3} className="btn btn-ink w-full">{busy ? "Sending…" : answered < 3 ? `Answer at least 3 questions (${answered}/3)` : "Send my answers"}</button>
      </section>
    </form>
  );
}
