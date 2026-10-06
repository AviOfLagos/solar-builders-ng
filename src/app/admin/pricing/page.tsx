"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "../ui";

type Rules = { default?: number; floor?: number; brand: Record<string, number>; category: Record<string, number>; productMarkup: Record<string, number>; productFixed: Record<string, number> };
type Row = { id: string; name: string; brand: string; category: string; cost: number; price: number; live: number; markup: number; floored: boolean; fixed: boolean };
type Data = { base: { markup: number; floor: number; roundTo: number }; rules: Rules; brands: { slug: string; name: string }[]; categories: { slug: string; name: string }[]; products: Row[]; pending: number; canPublish: boolean };

const pct = (n: number) => `${+(n * 100).toFixed(2)}`;

/** A percentage box that saves on blur or Enter. Empty clears the rule. */
function PctBox({ value, placeholder, onSave, label }: { value?: number; placeholder?: string; onSave: (v: number | null) => void; label: string }) {
  const [v, setV] = useState(value == null ? "" : pct(value));
  const commit = () => { const t = v.trim(); const next = t === "" ? null : Number(t) / 100; if (next !== (value ?? null) && (next == null || Number.isFinite(next))) onSave(next); };
  return (
    <span className="relative inline-block">
      <input aria-label={label} inputMode="decimal" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="num w-24 rounded-lg border border-line bg-white py-1.5 pl-2 pr-6 text-right text-sm" />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-mute">%</span>
    </span>
  );
}

const Pct = (p: Parameters<typeof PctBox>[0]) => <PctBox key={String(p.value)} {...p} />;

export default function Pricing() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Data>("/admin/pricing").then(setD).catch((e) => setErr((e as Error).message)), []);
  useEffect(() => { load(); }, [load]);

  const save = async (scope: string, key: string, markup: number | null, fixed: number | null = null) => {
    setErr(""); setMsg("");
    try { setD(await api<Data>("/admin/pricing", { method: "PUT", body: { scope, key, markup, fixed } })); } catch (e) { setErr((e as Error).message); load(); }
  };
  const publish = async () => {
    setBusy(true); setErr(""); setMsg("");
    try { await api("/admin/pricing/publish", { body: {} }); setMsg("Rebuilding the site. New prices go live in about two minutes."); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  if (!d) return <p className="text-mute">{err || "Loading…"}</p>;
  const r = d.rules;
  const rows = d.products.filter((p) => !q || `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  const margin = (p: Row) => (p.price - p.cost) / p.cost;

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-4xl">Pricing</h1><p className="text-sm text-mute">Price = supplier cost + markup, rounded up to ₦{d.base.roundTo}. A fixed price on a product beats any markup. The margin floor beats everything.</p></div>

      {(err || msg) && <p role="alert" className={`rounded-xl p-3 text-sm ${err ? "bg-flare/10 text-flare" : "bg-mint-tint"}`}>{err || msg}</p>}

      <div className={`flex flex-wrap items-center gap-3 rounded-3xl p-4 ${d.pending ? "bg-lemon-tint" : "bg-paper"}`}>
        <Icon name={d.pending ? "clock" : "check"} />
        <p className="min-w-0 flex-1 text-sm"><b>{d.pending ? `${d.pending} product price${d.pending === 1 ? "" : "s"} changed, not live yet.` : "Live prices match your rules."}</b>{d.pending > 0 && !d.canPublish && " To publish from here, add a Vercel deploy hook as DEPLOY_HOOK_URL."}</p>
        <button className="btn btn-ink" disabled={busy || !d.pending || !d.canPublish} onClick={publish}>{busy ? "Starting…" : "Publish prices"}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-night p-5 text-white">
          <p className="text-sm text-white/60">Default markup</p>
          <div className="mt-2 flex items-center gap-3"><Pct label="Default markup" value={r.default ?? d.base.markup} onSave={(v) => v != null && save("default", "", v)} /><span className="text-xs text-white/50">on every product with no rule</span></div>
        </div>
        <div className="rounded-3xl bg-paper p-5">
          <p className="text-sm text-ink-2">Margin floor</p>
          <div className="mt-2 flex items-center gap-3"><Pct label="Margin floor" value={r.floor ?? d.base.floor} onSave={(v) => v != null && save("floor", "", v)} /><span className="text-xs text-mute">no price goes below cost + this</span></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="By brand" sub="Leave empty to use the default">
          <ul className="divide-y divide-line">{d.brands.map((b) => <li key={b.slug} className="flex items-center justify-between py-2 text-sm"><span className="font-medium">{b.name}</span><Pct label={`${b.name} markup`} value={r.brand[b.slug]} placeholder={pct(r.default ?? d.base.markup)} onSave={(v) => save("brand", b.slug, v)} /></li>)}</ul>
        </Panel>
        <Panel title="By category" sub="Brand rules win over category rules">
          <ul className="divide-y divide-line">{d.categories.map((c) => <li key={c.slug} className="flex items-center justify-between py-2 text-sm"><span className="font-medium">{c.name}</span><Pct label={`${c.name} markup`} value={r.category[c.slug]} placeholder={pct(r.default ?? d.base.markup)} onSave={(v) => save("category", c.slug, v)} /></li>)}</ul>
        </Panel>
      </div>

      <Panel title="Products" sub="Cost is private to the team." action={<label className="flex items-center gap-2 rounded-xl bg-haze px-3"><Icon name="search" size={16} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a product" aria-label="Find a product" className="w-44 bg-transparent py-2 text-sm outline-none" /></label>}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-2 font-semibold">Product</th><th className="py-2 text-right font-semibold">Cost</th><th className="py-2 text-right font-semibold">Markup</th><th className="py-2 text-right font-semibold">Fixed price</th><th className="py-2 text-right font-semibold">Margin</th><th className="py-2 text-right font-semibold">Live</th><th className="px-5 py-2 text-right font-semibold">New price</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="max-w-[260px] px-5 py-2"><p className="truncate font-medium">{p.name}</p><p className="text-xs capitalize text-mute">{p.brand.replace(/-/g, " ")}</p></td>
                  <td className="num py-2 text-right text-mute">{naira(p.cost)}</td>
                  <td className="py-2 text-right"><Pct label={`${p.name} markup`} value={r.productMarkup[p.id]} placeholder={pct(p.markup)} onSave={(v) => save("product", p.id, v)} /></td>
                  <td className="py-2 text-right"><input aria-label={`${p.name} fixed price`} inputMode="numeric" defaultValue={r.productFixed[p.id] ?? ""} key={`${p.id}-${r.productFixed[p.id] ?? ""}`} placeholder="—" onBlur={(e) => { const t = e.target.value.replace(/[^\d]/g, ""); const n = t ? Number(t) : null; if (n !== (r.productFixed[p.id] ?? null)) save("product", p.id, null, n); }} className="num w-28 rounded-lg border border-line bg-white px-2 py-1.5 text-right text-sm" /></td>
                  <td className={`num py-2 text-right ${p.floored ? "font-semibold text-flare" : ""}`}>{pct(margin(p))}%{p.floored && <span title="Raised to the margin floor"> ⚑</span>}</td>
                  <td className="num py-2 text-right text-mute">{naira(p.live)}</td>
                  <td className={`num px-5 py-2 text-right font-semibold ${p.price !== p.live ? "text-mint-deep" : ""}`}>{naira(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
