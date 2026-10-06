"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { ago } from "../ui";

type R = { id: string; commission: number; order_status: string; seller: string; slug: string; whatsapp: string; status: string; paid_at: string | null; ref: string; created_at: string };
type D = { rows: R[]; totals: { earned: number; approved: number; paid: number } };

export default function Payouts() {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { api<D>("/admin/payouts").then(setD).catch((e) => setErr((e as Error).message)); }, []);
  useEffect(load, [load]);
  const pay = async (orderId: string) => {
    const ref = prompt("Transfer reference (optional)") ?? null;
    if (ref === null) return;
    setErr("");
    try { setD(await api<D>("/admin/payouts", { body: { orderId, status: "paid", ref } })); } catch (e) { setErr((e as Error).message); }
  };
  const tiles: [string, number, string][] = [["Earned, not due yet", d?.totals.earned ?? 0, "Order not delivered"], ["Ready to pay", d?.totals.approved ?? 0, "Delivered orders"], ["Paid out", d?.totals.paid ?? 0, "All time"]];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Payouts</h1><p className="text-sm text-mute">Seller commission. It becomes payable once the order is delivered.</p></div>
        <a className="btn btn-ghost" href="/api/v1/admin/payouts?format=csv">Download CSV</a>
      </div>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-3">{tiles.map(([l, v, n]) => <div key={l} className="rounded-3xl bg-paper p-5"><p className="text-sm font-semibold text-ink-2">{l}</p><p className="num mt-2 text-3xl font-light">{naira(v)}</p><p className="text-xs text-mute">{n}</p></div>)}</div>
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-3 font-semibold">Order</th><th className="font-semibold">Seller</th><th className="text-right font-semibold">Commission</th><th className="font-semibold pl-6">Status</th><th /></tr></thead>
          <tbody>
            {!d ? <tr><td colSpan={5} className="p-8 text-center text-mute">Loading…</td></tr> : !d.rows.length ? <tr><td colSpan={5} className="p-8 text-center text-mute">No commission yet.</td></tr> : d.rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3 font-semibold">{r.id}<p className="text-xs font-normal text-mute">{ago(r.created_at)}</p></td>
                <td className="py-3">{r.seller}<p className="text-xs text-mute">{r.whatsapp}</p></td>
                <td className="num py-3 text-right">{naira(r.commission)}</td>
                <td className="py-3 pl-6">{r.status === "paid" ? `Paid${r.ref ? " · " + r.ref : ""}` : r.status === "approved" ? "Ready to pay" : "Earned"}</td>
                <td className="px-5 py-3 text-right">{r.status === "approved" && <button className="btn btn-ink !py-1.5 text-xs" onClick={() => pay(r.id)}>Mark paid</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
