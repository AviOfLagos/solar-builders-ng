"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { naira, ngLocal } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Pill, ago } from "../ui";

type Order = {
  id: string; status: string; label: string; status_at: string; created_at: string; subtotal: number; total_paid: number; gift_card_used: number; commission: number;
  buyer: { name: string; phone: string; email: string }; delivery: { lga: string; address: string; landmark?: string; notes?: string; phone?: string };
  recipient: { name: string; phone: string } | null; installer: boolean; pool_id: string | null; source: string;
  lines: { id: string; qty: number; name: string; brand: string }[];
};
const FLOW = ["pending", "confirmed", "out_for_delivery", "delivered", "installed"] as const;
const FLOW_LABEL: Record<string, string> = { pending: "Pending", confirmed: "Confirmed", out_for_delivery: "On the way", delivered: "Delivered", installed: "Installed" };

function Orders() {
  const q0 = useSearchParams();
  const [status, setStatus] = useState(q0.get("status") ?? "");
  const [q, setQ] = useState(q0.get("q") ?? "");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(q0.get("q"));
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api<{ orders: Order[] }>(`/admin/orders?status=${status}&q=${encodeURIComponent(q)}`).then((r) => setOrders(r.orders)).catch((e) => setErr((e as Error).message));
  }, [status, q]);
   
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const sel = orders?.find((o) => o.id === open) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Orders</h1><p className="text-sm text-mute">Move each paid order from pending to installed.</p></div>
        <label className="flex items-center gap-2 rounded-xl bg-paper px-3"><Icon name="search" size={18} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, name or phone" className="w-56 bg-transparent py-2.5 text-sm outline-none" aria-label="Search orders" /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ...FLOW.map((s) => [s, FLOW_LABEL[s]]), ["refunded", "Refunded"], ["cancelled", "Cancelled"]].map(([v, l]) => (
          <button key={v} aria-pressed={status === v} onClick={() => setStatus(v)} className="chip">{l}</button>
        ))}
      </div>
      {err && <p className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute">
            <th className="px-5 py-3 font-semibold">Order</th><th className="py-3 font-semibold">Customer</th><th className="py-3 font-semibold">Deliver to</th><th className="py-3 font-semibold">Items</th><th className="py-3 text-right font-semibold">Paid</th><th className="px-5 py-3 text-right font-semibold">Status</th>
          </tr></thead>
          <tbody>
            {!orders ? <tr><td colSpan={6} className="p-8 text-center text-mute">Loading…</td></tr> : !orders.length ? <tr><td colSpan={6} className="p-8 text-center text-mute">No orders match.</td></tr> : orders.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o.id)} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-haze/60">
                <td className="px-5 py-3"><p className="font-semibold">{o.id}</p><p className="text-xs text-mute">{ago(o.created_at)}{o.pool_id ? " · Go Solar Me" : ""}</p></td>
                <td className="py-3">{o.buyer.name}<p className="text-xs text-mute">{ngLocal(o.buyer.phone)}</p></td>
                <td className="py-3">{(o.recipient ?? o.buyer).name}<p className="text-xs text-mute">{o.delivery.lga}{o.installer ? " · installer" : ""}</p></td>
                <td className="max-w-[240px] py-3"><p className="truncate">{o.lines[0]?.name}</p>{o.lines.length > 1 && <p className="text-xs text-mute">+{o.lines.length - 1} more</p>}</td>
                <td className="num py-3 text-right font-semibold">{naira(o.total_paid + o.gift_card_used)}</td>
                <td className="px-5 py-3 text-right"><Pill status={o.status} label={FLOW_LABEL[o.status] ?? o.label} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel && <Drawer o={sel} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

function Drawer({ o, onClose, onChanged }: { o: Order; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [refund, setRefund] = useState(false);
  const [reason, setReason] = useState("");
  const at = FLOW.indexOf(o.status as (typeof FLOW)[number]);
  const move = async (status: string) => {
    setBusy(true); setMsg("");
    try { await api(`/team/orders/${o.id}`, { method: "PATCH", body: { status } }); onChanged(); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const doRefund = async () => {
    setBusy(true); setMsg("");
    try { await api(`/team/orders/${o.id}`, { body: { reason } }); setRefund(false); onChanged(); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const to = o.recipient ?? o.buyer;
  const phone = (o.recipient?.phone || o.delivery.phone || o.buyer.phone).replace(/^0/, "234").replace(/^\+/, "");
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Order ${o.id}`}>
      <button className="absolute inset-0 bg-ink/30" aria-label="Close" onClick={onClose} />
      <aside className="rise absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-paper shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div><p className="text-sm text-mute">Order</p><p className="text-2xl font-semibold">{o.id}</p><p className="text-sm text-mute">{new Date(o.created_at).toLocaleString("en-NG")}</p></div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-haze" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="space-y-5 p-5">
          {at >= 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Progress</p>
              <ol className="grid grid-cols-5 gap-1">
                {FLOW.map((s, i) => (
                  <li key={s}>
                    <button disabled={busy || i === at} onClick={() => move(s)} className="w-full space-y-1.5 text-left disabled:cursor-default" title={`Mark as ${FLOW_LABEL[s]}`}>
                      <span className={`block h-2 rounded-full ${i <= at ? "bg-mint-deep" : "bg-line"}`} />
                      <span className={`block text-[11px] font-semibold ${i === at ? "text-ink" : "text-mute"}`}>{FLOW_LABEL[s]}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {at < FLOW.length - 1 && (
                <button disabled={busy} onClick={() => move(FLOW[at + 1])} className="btn btn-ink mt-3 w-full">{busy ? "Saving…" : `Mark as ${FLOW_LABEL[FLOW[at + 1]]}`}</button>
              )}
            </div>
          ) : <Pill status={o.status} label={o.label} />}

          <div className="rounded-2xl bg-haze p-4 text-sm">
            <p className="font-semibold">Deliver to {to.name}</p>
            <p className="text-ink-2">{o.delivery.address || "Address not added yet"}{o.delivery.landmark ? `, near ${o.delivery.landmark}` : ""}, {o.delivery.lga}</p>
            {o.delivery.notes && <p className="mt-1 text-ink-2">Note: {o.delivery.notes}</p>}
            <div className="mt-3 flex gap-2">
              <a href={`tel:${(o.recipient?.phone || o.buyer.phone)}`} className="btn btn-ghost flex-1 !py-2 text-sm">Call</a>
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener" className="btn btn-ink flex-1 !py-2 text-sm">WhatsApp</a>
            </div>
          </div>

          <div className="text-sm">
            <p className="mb-2 font-semibold">Items</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {o.lines.map((l) => <li key={l.id} className="flex justify-between gap-3 p-3"><span>{l.qty} × {l.name}<span className="block text-xs text-mute">{l.brand}</span></span></li>)}
            </ul>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between"><dt className="text-mute">Paid</dt><dd className="num font-semibold">{naira(o.total_paid)}</dd></div>
              {o.gift_card_used > 0 && <div className="flex justify-between"><dt className="text-mute">Gift card</dt><dd className="num">{naira(o.gift_card_used)}</dd></div>}
              {o.commission > 0 && <div className="flex justify-between"><dt className="text-mute">Seller commission</dt><dd className="num">{naira(o.commission)}</dd></div>}
              <div className="flex justify-between"><dt className="text-mute">Installer</dt><dd>{o.installer ? "Requested" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Buyer</dt><dd>{o.buyer.name} · {ngLocal(o.buyer.phone)}</dd></div>
            </dl>
          </div>

          {msg && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{msg}</p>}
          {at >= 0 && (refund ? (
            <div className="space-y-2 rounded-2xl border border-flare/30 p-4">
              <p className="text-sm font-semibold">Refund the full order</p>
              <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? (kept on record)" />
              <div className="flex gap-2"><button className="btn btn-ghost flex-1" onClick={() => setRefund(false)}>Keep order</button><button className="btn flex-1 bg-flare text-white" disabled={busy || reason.trim().length < 3} onClick={doRefund}>Refund</button></div>
            </div>
          ) : <button onClick={() => setRefund(true)} className="w-full py-2 text-sm font-semibold text-flare underline">Refund this order</button>)}
        </div>
      </aside>
    </div>
  );
}

export default function Page() {
  return <Suspense><Orders /></Suspense>;
}
