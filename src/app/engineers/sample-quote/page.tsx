import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { naira } from "@/lib/format";
import { SAMPLE } from "@/data/engineer-survey";

export const metadata: Metadata = {
  title: `Sample quote ${SAMPLE.version}`,
  description: "The sample solar quote installers review in our installer interview.",
  robots: { index: false, follow: false },
};

/** The frozen sample quote from the installer interview. Never edit a published version (see SAMPLE_QUOTES). */
export default function SampleQuote() {
  const c = SAMPLE.client;
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link href="/" aria-label="Home"><Logo /></Link>
        <Link href="/engineers" className="text-sm font-semibold underline underline-offset-4">Back to the interview</Link>
      </div>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16">
        <div className="rounded-3xl bg-night p-6 text-white">
          <p className="text-sm text-white/60">Sample quote {SAMPLE.version} · {SAMPLE.date}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{SAMPLE.kit.name}: {SAMPLE.kit.product}</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-night-soft p-4"><p className="num text-2xl font-light text-mint">{naira(SAMPLE.kit.price)}</p><p className="text-xs text-white/60">Equipment</p></div>
            <div className="rounded-2xl bg-night-soft p-4"><p className="num text-2xl font-light text-mint">{naira(SAMPLE.install[0])}–{naira(SAMPLE.install[1])}</p><p className="text-xs text-white/60">Installation (our estimate)</p></div>
            <div className="rounded-2xl bg-night-soft p-4"><p className="num text-2xl font-light text-mint">{SAMPLE.need.kw} kW · {SAMPLE.need.kwh} kWh</p><p className="text-xs text-white/60">What we worked out they need</p></div>
          </div>
        </div>

        <section className="card p-5">
          <h2 className="font-semibold">The client</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[["Building", c.building], ["Area", c.area], ["Use", c.use], ["Roof", c.roof], ["Cable run", c.run], ["Changeover", c.changeover], ["Earthing", c.earthing], ["Backup needed", c.hours]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1.5"><dt className="text-mute">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-mute">Wants to run</p>
          <ul className="mt-1 flex flex-wrap gap-2">{c.runs.map((r) => <li key={r} className="rounded-full bg-haze px-3 py-1 text-sm">{r}</li>)}</ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Equipment</h2>
          <p className="mt-1 text-sm text-mute">One kit, one price</p>
          <ul className="mt-3 space-y-2 text-sm">{SAMPLE.kit.contents.map((x) => <li key={x} className="rounded-xl bg-haze px-3 py-2">{x}</li>)}</ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3 font-semibold"><span>Equipment total</span><span className="num">{naira(SAMPLE.kit.price)}</span></div>
          <div className="mt-1 flex justify-between text-sm text-mute"><span>Installation (estimate)</span><span className="num">{naira(SAMPLE.install[0])} – {naira(SAMPLE.install[1])}</span></div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Notes on the quote</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">{SAMPLE.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>

        <Link href="/engineers" className="btn btn-ink w-full">Back to the interview</Link>
      </main>
    </div>
  );
}
