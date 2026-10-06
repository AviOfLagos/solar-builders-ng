"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type S = { id: string; name: string; email: string; phone: string; brands: string[]; notes: string; active: boolean; pos: number };
const BLANK = { id: "", name: "", email: "", phone: "", brands: "", notes: "", active: true };

export default function Suppliers() {
  const [list, setList] = useState<S[] | null>(null);
  const [f, setF] = useState<typeof BLANK | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { api<{ suppliers: S[] }>("/admin/suppliers").then((r) => setList(r.suppliers)).catch((e) => setErr((e as Error).message)); }, []);
  useEffect(load, [load]);
  const save = async () => {
    if (!f) return;
    setErr("");
    try { const r = await api<{ suppliers: S[] }>("/admin/suppliers", { body: { ...f, brands: f.brands.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) } }); setList(r.suppliers); setF(null); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Suppliers</h1><p className="text-sm text-mute">Who we buy from. Brands (for example felicity, itel) decide which items go on a purchase order; leave blank for all.</p></div>
        <button className="btn btn-ink" onClick={() => setF({ ...BLANK })}>Add supplier</button>
      </div>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      {f && (
        <div className="grid gap-3 rounded-3xl bg-paper p-5 sm:grid-cols-2">
          <input className="field" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="field" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className="field" placeholder="Phone / WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="field" placeholder="Brands, comma separated" value={f.brands} onChange={(e) => setF({ ...f, brands: e.target.value })} />
          <input className="field sm:col-span-2" placeholder="Notes (payment terms, pickup point)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
          <div className="flex gap-2 sm:justify-end"><button className="btn btn-ghost" onClick={() => setF(null)}>Cancel</button><button className="btn btn-ink" onClick={save}>Save</button></div>
        </div>
      )}
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-3 font-semibold">Supplier</th><th className="font-semibold">Contact</th><th className="font-semibold">Brands</th><th className="font-semibold">POs</th><th /></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={5} className="p-8 text-center text-mute">Loading…</td></tr> : !list.length ? <tr><td colSpan={5} className="p-8 text-center text-mute">No suppliers yet.</td></tr> : list.map((s) => (
              <tr key={s.id} className={`border-b border-line/60 last:border-0 ${s.active ? "" : "opacity-50"}`}>
                <td className="px-5 py-3 font-semibold">{s.name}{s.notes && <p className="text-xs font-normal text-mute">{s.notes}</p>}</td>
                <td className="py-3">{s.email || "-"}<p className="text-xs text-mute">{s.phone}</p></td>
                <td className="py-3">{s.brands.join(", ") || "All"}</td>
                <td className="num py-3">{s.pos}</td>
                <td className="px-5 py-3 text-right"><button className="text-sm font-semibold underline" onClick={() => setF({ id: s.id, name: s.name, email: s.email, phone: s.phone, brands: s.brands.join(", "), notes: s.notes, active: s.active })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
