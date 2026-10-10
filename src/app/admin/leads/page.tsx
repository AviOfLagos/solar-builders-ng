"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira, ngLocal } from "@/lib/format";
import { Pill, ago } from "../ui";

type Lead = { id: string; name: string; phone: string; email: string; consent: boolean; source: string; items: unknown[]; total: number; note: string; status: string; order_id: string | null; updated_at: string; site?: Record<string, string | number>; sizing?: { kw?: number; kwh?: number } };
const STATUSES = [["new", "New"], ["contacted", "Contacted"], ["engaged", "Talking"], ["ready_to_buy", "Ready to buy"], ["paid", "Paid"], ["lost", "Lost"]] as const;
const label = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;

export default function Leads() {
  const [status, setStatus] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { api<{ leads: Lead[] }>(`/admin/leads?status=${status}`).then((r) => setLeads(r.leads)).catch((e) => setErr((e as Error).message)); }, [status]);
   
  useEffect(load, [load]);
  const set = async (id: string, s: string) => {
    setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, status: s } : l)) ?? null);
    await api(`/admin/leads/${id}`, { method: "PATCH", body: { status: s } }).catch((e) => setErr((e as Error).message));
  };
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-4xl">Leads</h1><p className="text-sm text-mute">People who left a number but haven&apos;t paid yet, and brands asking to be stocked.</p></div>
      <div className="flex flex-wrap gap-2">
        <button aria-pressed={status === ""} onClick={() => setStatus("")} className="chip">All</button>
        {STATUSES.map(([k, l]) => <button key={k} aria-pressed={status === k} onClick={() => setStatus(k)} className="chip">{l}</button>)}
      </div>
      {err && <p className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-3 font-semibold">Person</th><th className="py-3 font-semibold">From</th><th className="py-3 font-semibold">Cart</th><th className="py-3 font-semibold">Last seen</th><th className="py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Reach</th></tr></thead>
          <tbody>
            {!leads ? <tr><td colSpan={6} className="p-8 text-center text-mute">Loading…</td></tr> : !leads.length ? <tr><td colSpan={6} className="p-8 text-center text-mute">No leads here.</td></tr> : leads.map((l) => (
              <tr key={l.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3"><p className="font-semibold">{l.name || "No name"}</p><p className="text-xs text-mute">{l.phone ? ngLocal(l.phone) : l.email}</p>{l.note && <p className="mt-1 max-w-xs text-xs text-ink-2">{l.note}</p>}</td>
                <td className="py-3"><span className="capitalize">{l.source}</span>{l.site && Object.keys(l.site).length > 0 && <p className="max-w-[220px] text-xs text-mute">{[l.site.building, l.site.lga, l.site.roof && `${l.site.roof} roof`, l.site.panelRunM && `${l.site.panelRunM}m run`, l.site.changeover === "yes" && "has changeover", l.site.notes].filter(Boolean).join(" · ")}{l.sizing?.kw ? ` · needs ${l.sizing.kw} kW / ${l.sizing.kwh} kWh` : ""}</p>}</td>
                <td className="num py-3">{l.total ? naira(l.total) : "—"}<p className="text-xs text-mute">{l.items.length} items</p></td>
                <td className="py-3 text-mute">{ago(l.updated_at)}</td>
                <td className="py-3">
                  <label className="relative inline-flex items-center"><Pill status={l.status} label={label(l.status)} />
                    <select aria-label={`Status for ${l.name || l.phone}`} value={l.status} onChange={(e) => set(l.id, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                      {STATUSES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </label>
                </td>
                <td className="px-5 py-3 text-right">
                  {l.phone && l.consent ? <a href={`https://wa.me/${l.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener" onClick={() => l.status === "new" && set(l.id, "contacted")} className="btn btn-ink !px-3 !py-1.5 text-xs">WhatsApp</a>
                    : l.email ? <a href={`mailto:${l.email}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">Email</a> : <span className="text-xs text-mute">No consent</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
