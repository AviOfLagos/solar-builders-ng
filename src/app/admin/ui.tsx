"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function Panel({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-paper p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="font-semibold">{title}</h2>{sub && <p className="text-sm text-mute">{sub}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Change against the previous period, with an arrow so it never relies on colour. */
export function Delta({ value, prev }: { value: number; prev: number }) {
  if (!prev && !value) return <span className="text-xs text-mute">No data yet</span>;
  if (!prev) return <span className="rounded-lg bg-mint-tint px-2 py-0.5 text-xs font-bold text-mint-deep">New</span>;
  const pct = ((value - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${up ? "bg-mint-tint text-mint-deep" : "bg-flare/10 text-flare"}`}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>{Math.abs(pct).toFixed(pct > -10 && pct < 10 ? 1 : 0)}%
    </span>
  );
}

export function Kpi({ label, value, prev, show, icon, dark }: { label: string; value: number; prev: number; show: string; icon: string; dark?: boolean }) {
  return (
    <div className={`flex flex-col justify-between rounded-3xl p-5 ${dark ? "bg-night text-white" : "bg-paper"}`}>
      <div className="flex items-start justify-between">
        <p className={`text-sm font-semibold ${dark ? "text-white/60" : "text-ink-2"}`}>{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? "bg-mint text-ink" : "bg-haze"}`}><Icon name={icon} size={19} /></span>
      </div>
      <p className={`num mt-3 text-[2rem] font-light leading-none tracking-tight ${dark ? "text-mint" : ""}`}>{show}</p>
      <div className={`mt-3 flex items-center gap-2 text-xs ${dark ? "text-white/50" : "text-mute"}`}><Delta value={value} prev={prev} /><span>vs previous period</span></div>
    </div>
  );
}

/** Columns over time for one measure, with a hover readout. */
export function Columns({ data, format, height = 220, color = "var(--color-mint-deep)" }: { data: { label: string; value: number }[]; format: (n: number) => string; height?: number; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const w = 100 / Math.max(1, data.length);
  const ticks = [0, 0.5, 1].map((t) => nice * t);
  const every = Math.ceil(data.length / 8);
  return (
    <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
      <div className="absolute inset-0 bottom-6 left-12">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(t / nice) * 100}%` }}>
            <span className="num absolute -left-12 -translate-y-1/2 text-[11px] text-mute">{short(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end">
          {data.map((d, i) => (
            <div key={d.label} className="relative flex h-full items-end justify-center" style={{ width: `${w}%` }} onMouseEnter={() => setHover(i)}>
              <div className="w-[62%] max-w-7 rounded-t-[4px] transition-opacity" style={{ height: `${(d.value / nice) * 100}%`, minHeight: d.value ? 2 : 0, background: color, opacity: hover === null || hover === i ? 1 : 0.45 }} />
              {i % every === 0 && <span className="num absolute -bottom-6 whitespace-nowrap text-[11px] text-mute">{d.label}</span>}
            </div>
          ))}
        </div>
        {hover !== null && (
          <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-night px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${(hover + 0.5) * w}%` }}>
            <p className="text-white/60">{data[hover].label}</p><p className="num font-bold">{format(data[hover].value)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** A ranked list with bars, for top pages, brands, sources and the funnel. */
export function Bars({ rows, format, empty = "Nothing yet." }: { rows: { label: string; value: number; note?: string }[]; format: (n: number) => string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-mute">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="truncate font-medium">{r.label}</span><span className="num shrink-0 font-semibold">{format(r.value)}{r.note && <span className="ml-1.5 font-normal text-mute">{r.note}</span>}</span></div>
          <div className="h-2 rounded-full bg-haze"><div className="h-full rounded-full bg-mint-deep" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-lemon text-ink", confirmed: "bg-mint-tint text-mint-deep", out_for_delivery: "bg-mint text-ink",
  delivered: "bg-night text-mint", installed: "bg-night text-white", cancelled: "bg-flare/10 text-flare", refunded: "bg-flare/10 text-flare",
  new: "bg-lemon text-ink", contacted: "bg-mint-tint text-mint-deep", engaged: "bg-mint text-ink", ready_to_buy: "bg-night text-mint", paid: "bg-night text-white", lost: "bg-haze text-mute",
  open: "bg-mint text-ink", funded: "bg-night text-mint", ended: "bg-lemon text-ink",
};
export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold ${STATUS_TONE[status] ?? "bg-haze text-ink-2"}`}>{label ?? status.replace(/_/g, " ")}</span>;
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-paper p-1" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${value === v ? "bg-night text-white" : "text-ink-2 hover:text-ink"}`}>{l}</button>
      ))}
    </div>
  );
}

export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};
export const short = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
function niceMax(n: number) {
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= n) ?? n;
}
