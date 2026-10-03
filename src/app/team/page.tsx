"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira, ngLocal } from "@/lib/format";
import { FULFILMENT, ORDER_STATUS, STORE, type OrderStatus } from "@/config/store";

type Lead = { id: string; name: string; phone: string; email: string; consent: boolean; source: string; items: { id: string; qty: number }[]; total: number; contacted_at: string | null; updated_at: string };
type Order = { id: string; items: { name: string; qty: number }[]; subtotal: number; total_paid: number; gift_card_used: number; commission: number; buyer: { name: string; phone: string; email: string }; delivery: { name: string; phone: string; address: string; lga: string; landmark: string }; recipient: { name: string } | null; installer: boolean; status: OrderStatus; pool_id: string | null; created_at: string };
type Pool = { id: string; kind: string; title: string; goal: number; raised: number; status: string; deadline: string; owner: string; owner_email: string };
type Finance = { id: string; name: string; phone: string; email: string; employment: string; income_band: string; total: number; down_pct: number; months: number; created_at: string };
type Data = { leads: Lead[]; orders: Order[]; pools: Pool[]; finance: Finance[]; money: { paid_in: number; refunded: number; covered: number } };

const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
const when = (d: string) => new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Team() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"orders" | "leads" | "pools" | "finance">("orders");
  const load = useCallback(() => { setErr(""); api<Data>("/team/overview").then(setD).catch((e) => setErr((e as Error).message)); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load
  useEffect(() => { load(); }, [load]);

  if (err) return <div className="mx-auto max-w-md px-4 py-20 text-center"><p>{err}</p><p className="mt-2 text-sm text-mute">The team page needs a team email signed in with Google.</p><Link className="btn btn-ink mt-4" href="/account?next=/team">Sign in</Link></div>;
  if (!d) return <div className="mx-auto max-w-5xl px-4 py-16 text-mute">Loading…</div>;
  const tabs = [["orders", `Orders (${d.orders.length})`], ["leads", `Follow up (${d.leads.filter((l) => !l.contacted_at).length})`], ["pools", `Go Solar Me (${d.pools.length})`], ["finance", `Pay small small (${d.finance.length})`]] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Team</h1>
      <p className="mt-1 text-sm text-mute">Last 30 days: {naira(d.money.paid_in)} paid in · {naira(d.money.refunded)} refunded · {naira(d.money.covered)} covered by us</p>
      <div className="mt-6 flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-2 text-sm ${tab === k ? "border-ink bg-ink text-white" : "border-line"}`}>{l}</button>)}<button className="ml-auto text-sm underline" onClick={load}>Refresh</button></div>
      {tab === "orders" && <ul className="mt-6 space-y-3">{d.orders.map((o) => <OrderRow key={o.id} o={o} onChange={load} />)}{!d.orders.length && <Empty />}</ul>}
      {tab === "leads" && (
        <ul className="mt-6 space-y-3">
          {d.leads.map((l) => (
            <li key={l.id} className={`rounded-xl border border-line p-4 text-sm ${l.contacted_at ? "bg-haze" : "bg-paper"}`}>
              <div className="flex flex-wrap justify-between gap-2"><b>{l.name || "No name"} · {l.phone ? ngLocal(l.phone) : l.email}</b><span className="num">{naira(l.total)} · {l.items.length} items · {l.source}</span></div>
              <p className="mt-1 text-mute">Last active {when(l.updated_at)}{l.contacted_at ? ` · contacted ${when(l.contacted_at)}` : ""}{l.consent ? "" : " · no consent"}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {l.phone && <a className="font-semibold underline" target="_blank" rel="noopener" href={wa(l.phone, `Hi${l.name ? " " + l.name.split(" ")[0] : ""}, it's ${STORE.shortName}. Your solar kit (${naira(l.total)}) is still in your cart. Pick up where you left off: ${STORE.url}/cart?resume=${l.id}\nAny questions? Just reply here.`)}>WhatsApp</a>}
                {l.email && <a className="underline" href={`mailto:${l.email}`}>Email</a>}
                {!l.contacted_at && <button className="underline" onClick={() => api(`/team/leads/${l.id}`, { method: "PATCH" }).then(load).catch(() => load())}>Mark contacted</button>}
              </div>
            </li>
          ))}
          {!d.leads.length && <Empty />}
        </ul>
      )}
      {tab === "pools" && (
        <ul className="mt-6 space-y-3">
          {d.pools.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-paper p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><Link className="font-semibold underline" href={`/fund/${p.id}`}>{p.title}</Link><span className="num">{naira(p.raised)} of {naira(p.goal)}</span></div>
              <p className="mt-1 text-mute">{p.kind} · {p.status} · deadline {when(p.deadline)} · {p.owner} ({p.owner_email})</p>
            </li>
          ))}
          {!d.pools.length && <Empty />}
        </ul>
      )}
      {tab === "finance" && (
        <ul className="mt-6 space-y-3">
          {d.finance.map((f) => (
            <li key={f.id} className="rounded-xl border border-line bg-paper p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><b>{f.name} · {ngLocal(f.phone)}</b><span className="num">{naira(f.total)} · {f.down_pct}% down · {f.months} months</span></div>
              <p className="mt-1 text-mute">{f.employment} · {f.income_band} · {when(f.created_at)}</p>
              <a className="mt-2 inline-block font-semibold underline" target="_blank" rel="noopener" href={wa(f.phone, `Hi ${f.name.split(" ")[0]}, it's ${STORE.shortName} about your pay-small-small request.`)}>WhatsApp</a>
            </li>
          ))}
          {!d.finance.length && <Empty />}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ o, onChange }: { o: Order; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [refund, setRefund] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const active = FULFILMENT.includes(o.status);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setMsg(""); try { await fn(); onChange(); } catch (e) { setMsg((e as Error).message); } setBusy(false); };
  return (
    <li className="rounded-xl border border-line bg-paper p-4 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <b>{o.id}{o.pool_id ? " · Go Solar Me" : ""}{o.installer ? " · installer" : ""}</b>
        <span className="num">{naira(o.total_paid + o.gift_card_used)}{o.gift_card_used ? ` (gift ${naira(o.gift_card_used)})` : ""}{o.commission ? ` · commission ${naira(o.commission)}` : ""}</span>
      </div>
      <p className="mt-1">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
      <p className="mt-1 text-mute">Buyer {o.buyer.name} · {o.buyer.phone ? ngLocal(o.buyer.phone) : "no phone"} · {o.buyer.email}</p>
      <p className="text-mute">Deliver to {o.delivery.name} · {ngLocal(o.delivery.phone)} · {o.delivery.address || <b className="text-flare">ADDRESS NEEDED</b>}{o.delivery.landmark ? ` (near ${o.delivery.landmark})` : ""}, {o.delivery.lga} · {when(o.created_at)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {active ? (
          <select className="field !w-auto !py-1.5 text-sm" disabled={busy} value={o.status} onChange={(e) => run(() => api(`/team/orders/${o.id}`, { method: "PATCH", body: { status: e.target.value } }))} aria-label="Order status">
            {FULFILMENT.map((s) => <option key={s} value={s}>{ORDER_STATUS[s]}</option>)}
          </select>
        ) : <span className="rounded-full bg-haze px-3 py-1">{ORDER_STATUS[o.status] ?? o.status}</span>}
        <a className="underline" target="_blank" rel="noopener" href={wa(o.delivery.phone, `Hi ${o.delivery.name.split(" ")[0]}, it's ${STORE.shortName} about order ${o.id}.`)}>WhatsApp</a>
        {active && refund === null && <button className="text-flare underline" onClick={() => setRefund("")}>Refund…</button>}
      </div>
      {refund !== null && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => api(`/team/orders/${o.id}`, { body: { reason: refund } })).then(() => setRefund(null)); }}>
          <input className="field !w-auto flex-1 !py-1.5" placeholder="Why? (kept on record)" value={refund} maxLength={200} onChange={(e) => setRefund(e.target.value)} />
          <button className="btn btn-ink !py-1.5 text-xs" disabled={busy || refund.trim().length < 3}>{busy ? "Refunding…" : "Refund in full"}</button>
          <button type="button" className="text-xs underline" onClick={() => setRefund(null)}>Cancel</button>
        </form>
      )}
      {msg && <p role="alert" className="mt-2 text-flare">{msg}</p>}
    </li>
  );
}

function Empty() { return <li className="rounded-xl border border-dashed border-line p-6 text-center text-mute">Nothing here yet.</li>; }
