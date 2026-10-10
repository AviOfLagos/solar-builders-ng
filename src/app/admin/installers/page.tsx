"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { REGIONS } from "@/config/store";

const regionLabel = (k: string) => REGIONS.find((r) => r.key === k)?.label ?? "";

type I = { id: string; name: string; phone: string; email: string; areas: string; rate: number; notes: string; active: boolean; jobs: number; done: number; primary_region: string; secondary_region: string };
const BLANK = { id: "", name: "", phone: "", email: "", areas: "", rate: "", notes: "", active: true, primaryRegion: "", secondaryRegion: "" };

export default function Installers() {
  const [list, setList] = useState<I[] | null>(null);
  const [f, setF] = useState<typeof BLANK | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { api<{ installers: I[] }>("/admin/installers").then((r) => setList(r.installers)).catch((e) => setErr((e as Error).message)); }, []);
  useEffect(load, [load]);
  const save = async () => {
    if (!f) return;
    setErr("");
    try { const r = await api<{ installers: I[] }>("/admin/installers", { body: { ...f, rate: Number(String(f.rate).replace(/[^\d]/g, "")) || 0 } }); setList(r.installers); setF(null); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Installers</h1><p className="text-sm text-mute">Engineers who fit systems. Their main area decides who an order offers the job to first.</p></div>
        <button className="btn btn-ink" onClick={() => setF({ ...BLANK })}>Add installer</button>
      </div>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      {f && (
        <div className="grid gap-3 rounded-3xl bg-paper p-5 sm:grid-cols-2">
          <input className="field" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="field" placeholder="Phone / WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="field" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className="field" placeholder="Usual fee (₦)" inputMode="numeric" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          <select className="field" aria-label="Main area" value={f.primaryRegion} onChange={(e) => setF({ ...f, primaryRegion: e.target.value })}><option value="">Main area…</option>{REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
          <select className="field" aria-label="Also covers" value={f.secondaryRegion} onChange={(e) => setF({ ...f, secondaryRegion: e.target.value })}><option value="">Also covers…</option>{REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
          <input className="field sm:col-span-2" placeholder="Notes on areas (e.g. Lekki Phase 1 only)" value={f.areas} onChange={(e) => setF({ ...f, areas: e.target.value })} />
          <input className="field sm:col-span-2" placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
          <div className="flex gap-2 sm:justify-end"><button className="btn btn-ghost" onClick={() => setF(null)}>Cancel</button><button className="btn btn-ink" onClick={save}>Save</button></div>
        </div>
      )}
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-3 font-semibold">Installer</th><th className="font-semibold">Areas</th><th className="font-semibold">Fee</th><th className="font-semibold">Jobs</th><th /></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={5} className="p-8 text-center text-mute">Loading…</td></tr> : !list.length ? <tr><td colSpan={5} className="p-8 text-center text-mute">No installers yet.</td></tr> : list.map((i) => (
              <tr key={i.id} className={`border-b border-line/60 last:border-0 ${i.active ? "" : "opacity-50"}`}>
                <td className="px-5 py-3 font-semibold">{i.name}<p className="text-xs font-normal text-mute">{i.phone}</p></td>
                <td className="py-3">{regionLabel(i.primary_region) || "-"}{i.secondary_region && <p className="text-xs text-mute">also {regionLabel(i.secondary_region)}</p>}</td>
                <td className="num py-3">{i.rate ? naira(i.rate) : "-"}</td>
                <td className="num py-3">{i.done}/{i.jobs} done</td>
                <td className="px-5 py-3 text-right"><button className="text-sm font-semibold underline" onClick={() => setF({ id: i.id, name: i.name, phone: i.phone, email: i.email, areas: i.areas, rate: String(i.rate || ""), notes: i.notes, active: i.active, primaryRegion: i.primary_region, secondaryRegion: i.secondary_region })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
