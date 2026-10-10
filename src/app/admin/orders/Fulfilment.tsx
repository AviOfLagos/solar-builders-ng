"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { ago } from "../ui";

type Po = { id: string; status: string; supplier: string | null; cost: number; delivery_cost: number; ship_to: string; sent_at: string | null; expected_at: string | null; items: { name: string; qty: number; cost: number }[] };
type Job = { status: string; installer: string | null; installer_phone: string; fee: number; job_date: string | null; photo_url: string };
type Margin = { revenue: number; goods: number; delivery: number; install: number; commission: number; profit: number; pct: number; estimated: boolean };
type Data = { pos: Po[]; job: Job | null; margin: Margin; installerRequested: boolean; suppliers: { id: string; name: string; brands: string[] }[]; installers: { id: string; name: string; rate: number }[]; wa?: string;
  engineers: { id: string; name: string; rate: number; match: "primary" | "secondary" | "other"; offeredAt: string | null; hasPhone: boolean }[] };

/** Everything we do after payment: buy the goods, book the installer, see what we kept. */
export function Fulfilment({ orderId }: { orderId: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sup, setSup] = useState("");
  const [shipTo, setShipTo] = useState("us");
  const [inst, setInst] = useState("");
  const [date, setDate] = useState("");
  const load = useCallback(() => { api<Data>(`/admin/fulfilment?order=${orderId}`).then(setD).catch((e) => setErr((e as Error).message)); }, [orderId]);
  useEffect(load, [load]);
  const act = async (body: Record<string, unknown>) => {
    setBusy(true); setErr("");
    try { const r = await api<Partial<Data>>("/admin/fulfilment", { body: { orderId, ...body } }); setD((x) => (x ? { ...x, ...r } : x)); if (r.wa && (body.action === "po.send" || body.action === "job.offer")) window.open(r.wa, "_blank", "noopener"); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  if (!d) return <p className="text-sm text-mute">{err || "Loading fulfilment…"}</p>;
  const m = d.margin;
  return (
    <div className="space-y-4 text-sm">
      <p className="font-semibold">Fulfilment</p>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-flare">{err}</p>}

      <div className="space-y-2">
        {d.pos.map((p) => (
          <div key={p.id} className="rounded-2xl border border-line p-3">
            <div className="flex items-center justify-between gap-2"><p className="font-semibold">{p.id} · {p.supplier ?? "Supplier"}</p><span className="chip !py-0.5 text-xs">{p.status}</span></div>
            <p className="text-xs text-mute">{p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
            <p className="mt-1 text-xs text-mute">Cost {naira(p.cost)} · delivery {naira(p.delivery_cost)} · ships to {p.ship_to === "customer" ? "the customer" : "us"}{p.sent_at ? ` · sent ${ago(p.sent_at)}` : ""}{p.expected_at ? ` · due ${p.expected_at.slice(0, 10)}` : ""}</p>
            {p.status !== "cancelled" && p.status !== "delivered" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {p.status === "draft" && <button disabled={busy} className="btn btn-ink !py-1.5 text-xs" onClick={() => act({ action: "po.send", poId: p.id, channel: "email" })}>Email supplier</button>}
                {p.status === "draft" && <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs" onClick={() => act({ action: "po.send", poId: p.id, channel: "manual" })}>Send on WhatsApp</button>}
                {p.status === "sent" && <button disabled={busy} className="btn btn-ink !py-1.5 text-xs" onClick={() => act({ action: "po.update", poId: p.id, status: "confirmed" })}>Supplier confirmed</button>}
                {(p.status === "sent" || p.status === "confirmed") && <button disabled={busy} className="btn btn-ink !py-1.5 text-xs" onClick={() => act({ action: "po.update", poId: p.id, status: "delivered" })}>Goods arrived</button>}
                <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs" onClick={() => { const v = prompt("Delivery cost we paid (₦)", String(p.delivery_cost)); if (v !== null) act({ action: "po.update", poId: p.id, deliveryCost: Number(v.replace(/[^\d]/g, "")) }); }}>Delivery cost</button>
                <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs text-flare" onClick={() => act({ action: "po.update", poId: p.id, status: "cancelled" })}>Cancel</button>
              </div>
            )}
          </div>
        ))}
        {d.suppliers.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <select className="field !w-auto flex-1 !py-2 text-sm" value={sup} onChange={(e) => setSup(e.target.value)} aria-label="Supplier"><option value="">Buy from…</option>{d.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="field !w-auto !py-2 text-sm" value={shipTo} onChange={(e) => setShipTo(e.target.value)} aria-label="Ship to"><option value="us">Deliver to us</option><option value="customer">Deliver to customer</option></select>
            <button disabled={busy || !sup} className="btn btn-ink !py-2 text-sm" onClick={() => act({ action: "po.create", supplierId: sup, shipTo }).then(() => setSup(""))}>Draft PO</button>
          </div>
        ) : <p className="text-xs text-mute">Add a supplier under Suppliers to draft purchase orders.</p>}
        {shipTo === "customer" && <p className="text-xs text-mute">The supplier will see the customer&apos;s name, phone and address.</p>}
      </div>

      <div className="rounded-2xl border border-line p-3">
        <p className="font-semibold">Installer {d.installerRequested ? <span className="text-xs font-normal text-mute">(customer asked for one)</span> : null}</p>
        {d.job ? (
          <>
            <p className="text-xs text-mute">{d.job.installer ?? "Installer"} · {d.job.status}{d.job.job_date ? ` · ${d.job.job_date.slice(0, 10)}` : ""} · fee {naira(d.job.fee)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.job.status !== "done" && d.job.status !== "declined" && <>
                {d.job.status === "assigned" && <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs" onClick={() => act({ action: "job.update", status: "accepted" })}>Accepted</button>}
                <button disabled={busy} className="btn btn-ink !py-1.5 text-xs" onClick={() => act({ action: "job.update", status: "done" })}>Job done</button>
                <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs text-flare" onClick={() => act({ action: "job.update", status: "declined" })}>Declined</button>
              </>}
              <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs" onClick={() => { const v = prompt("Link to the finished-job photo (https://…)", d.job?.photo_url ?? ""); if (v !== null) act({ action: "job.update", photoUrl: v }); }}>{d.job.photo_url ? "Change photo link" : "Add photo link"}</button>
              {d.job.installer_phone && <a className="btn btn-ghost !py-1.5 text-xs" target="_blank" rel="noopener" href={`https://wa.me/${d.job.installer_phone.replace(/\D/g, "").replace(/^0/, "234")}`}>WhatsApp</a>}
            </div>
          </>
        ) : d.installers.length ? (<>
          {d.engineers.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-mute">Offer it on WhatsApp. First to reply YES gets it, then assign them below.</p>
              {d.engineers.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-haze px-3 py-2">
                  <span className="min-w-0 text-xs"><span className="font-semibold">{e.name}</span> · {e.match === "primary" ? "works this area" : e.match === "secondary" ? "covers this area" : "other area"}{e.rate ? ` · ${naira(e.rate)}` : ""}{e.offeredAt ? ` · offered ${ago(e.offeredAt)}` : ""}</span>
                  <button disabled={busy || !e.hasPhone} className={`btn ${e.offeredAt ? "btn-ghost" : "btn-ink"} !py-1 text-xs`} onClick={() => act({ action: "job.offer", installerId: e.id })}>{e.offeredAt ? "Again" : "Offer"}</button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select className="field !w-auto flex-1 !py-2 text-sm" value={inst} onChange={(e) => setInst(e.target.value)} aria-label="Installer"><option value="">Assign…</option>{d.installers.map((i) => <option key={i.id} value={i.id}>{i.name}{i.rate ? ` · ${naira(i.rate)}` : ""}</option>)}</select>
            <input type="date" className="field !w-auto !py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Job date" />
            <button disabled={busy || !inst} className="btn btn-ink !py-2 text-sm" onClick={() => act({ action: "job.assign", installerId: inst, jobDate: date })}>Assign</button>
          </div>
        </>) : <p className="text-xs text-mute">Add an installer under Installers first.</p>}
      </div>

      <dl className="space-y-1 rounded-2xl bg-haze p-3">
        <div className="flex justify-between"><dt className="text-mute">Goods sold</dt><dd className="num">{naira(m.revenue)}</dd></div>
        <div className="flex justify-between"><dt className="text-mute">Cost of goods{m.estimated ? " (list price)" : ""}</dt><dd className="num">−{naira(m.goods)}</dd></div>
        {m.delivery > 0 && <div className="flex justify-between"><dt className="text-mute">Supplier delivery</dt><dd className="num">−{naira(m.delivery)}</dd></div>}
        {m.install > 0 && <div className="flex justify-between"><dt className="text-mute">Installer fee</dt><dd className="num">−{naira(m.install)}</dd></div>}
        {m.commission > 0 && <div className="flex justify-between"><dt className="text-mute">Seller commission</dt><dd className="num">−{naira(m.commission)}</dd></div>}
        <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>We keep</dt><dd className="num">{naira(m.profit)} · {(m.pct * 100).toFixed(1)}%</dd></div>
      </dl>
    </div>
  );
}
