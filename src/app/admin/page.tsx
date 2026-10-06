"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Bars, Columns, Kpi, Panel, Pill, Segmented, ago } from "./ui";

type K = { value: number; prev: number };
type Stats = {
  days: number;
  kpis: { revenue: K; orders: K; average: K; visitors: K; conversion: K; leads: K };
  views: number;
  pools: { open: number; raising: number };
  series: { date: string; revenue: number; orders: number; visitors: number }[];
  funnel: { step: string; n: number }[];
  weekly: { week: string; visitors: number; orders: number; revenue: number; leads: number; conversion: number }[];
  topPages: { path: string; n: number }[];
  topClicks: { name: string; n: number }[];
  sources: { ref: string; n: number }[];
  brands: { brand: string; amount: number }[];
  status: { status: string; label: string; n: number }[];
  late: { id: string; status: string; label: string; status_at: string; recipient: { name: string } | null; buyer: { name: string }; delivery: { lga: string } }[];
  recent: { id: string; status: string; label: string; total_paid: number; gift_card_used: number; buyer: { name: string }; delivery: { lga: string }; created_at: string; count: number; first: string }[];
};

const label = (d: string, days: number) => new Date(d + "T12:00:00").toLocaleDateString("en-NG", days > 31 ? { month: "short", day: "numeric" } : { day: "numeric", month: "short" });

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [metric, setMetric] = useState<"revenue" | "orders" | "visitors">("revenue");
  useEffect(() => { api<Stats>(`/admin/stats?days=${days}`).then((x) => { setS(x); setErr(""); }).catch((e) => setErr((e as Error).message)); }, [days]);

  if (err) return <p className="rounded-2xl bg-flare/10 p-4 text-flare">{err}</p>;
  if (!s) return <p className="text-mute">Loading…</p>;
  const k = s.kpis;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const top = s.funnel[0].n || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-2">
        <div>
          <h1 className="font-display text-4xl">Dashboard</h1>
          <p className="text-sm text-mute">Sales, visitors and what needs you today.</p>
        </div>
        <Segmented value={days} onChange={setDays} options={[[7, "7 days"], [30, "30 days"], [90, "90 days"]]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi dark label="Sales" icon="card" value={k.revenue.value} prev={k.revenue.prev} show={naira(k.revenue.value)} />
        <Kpi label="Paid orders" icon="truck" value={k.orders.value} prev={k.orders.prev} show={String(k.orders.value)} />
        <Kpi label="Visitors" icon="people" value={k.visitors.value} prev={k.visitors.prev} show={k.visitors.value.toLocaleString()} />
        <Kpi label="Visitors who paid" icon="bolt" value={k.conversion.value} prev={k.conversion.prev} show={pct(k.conversion.value)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel title={metric === "revenue" ? "Sales per day" : metric === "orders" ? "Orders per day" : "Visitors per day"}
          sub={`Average order ${naira(k.average.value)} · ${k.leads.value} new leads · ${s.views.toLocaleString()} page views`}
          action={<Segmented value={metric} onChange={setMetric} options={[["revenue", "Sales"], ["orders", "Orders"], ["visitors", "Visitors"]]} />}>
          <Columns data={s.series.map((d) => ({ label: label(d.date, s.days), value: d[metric] }))} format={(n) => (metric === "revenue" ? naira(n) : n.toLocaleString())} />
        </Panel>
        <Panel title="From visit to paid" sub="Browser tabs that reached each step">
          <ol className="space-y-3">
            {s.funnel.map((f, i) => {
              const prev = i ? s.funnel[i - 1].n : 0;
              return (
                <li key={f.step}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{f.step}</span>
                    <span className="num font-semibold">{f.n.toLocaleString()}{i > 0 && <span className="ml-1.5 font-normal text-mute">{prev ? Math.round((f.n / prev) * 100) : 0}% of previous</span>}</span>
                  </div>
                  <div className="h-7 rounded-lg bg-haze"><div className={`h-full rounded-lg ${i === s.funnel.length - 1 ? "bg-night" : "bg-mint"}`} style={{ width: `${Math.max(1.5, (f.n / top) * 100)}%` }} /></div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Recent orders" action={<Link href="/admin/orders" className="flex items-center gap-1 text-sm font-bold">View all<Icon name="arrow" size={16} /></Link>}>
          {s.recent.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-2 font-semibold">Order</th><th className="py-2 font-semibold">Customer</th><th className="py-2 font-semibold">Kit</th><th className="py-2 text-right font-semibold">Amount</th><th className="px-5 py-2 text-right font-semibold">Status</th></tr></thead>
                <tbody>
                  {s.recent.map((o) => (
                    <tr key={o.id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-3"><Link href={`/admin/orders?q=${o.id}`} className="font-semibold underline-offset-2 hover:underline">{o.id}</Link><p className="text-xs text-mute">{ago(o.created_at)}</p></td>
                      <td className="py-3">{o.buyer.name}<p className="text-xs text-mute">{o.delivery.lga}</p></td>
                      <td className="max-w-[220px] py-3"><p className="truncate">{o.first}</p>{o.count > 1 && <p className="text-xs text-mute">+{o.count - 1} more</p>}</td>
                      <td className="num py-3 text-right font-semibold">{naira(o.total_paid + o.gift_card_used)}</td>
                      <td className="px-5 py-3 text-right"><Pill status={o.status} label={o.label.split(":")[0]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="py-8 text-center text-sm text-mute">No orders yet.</p>}
        </Panel>
        <Panel title="Needs you" sub="Pending over 24h, or not delivered in 48h">
          {s.late.length ? (
            <ul className="space-y-2">
              {s.late.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders?q=${o.id}`} className="flex items-center gap-3 rounded-2xl bg-lemon-tint p-3 hover:bg-lemon">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lemon"><Icon name="clock" size={18} /></span>
                    <span className="min-w-0 flex-1 text-sm"><span className="block font-semibold">{o.id} · {(o.recipient ?? o.buyer).name}</span><span className="text-ink-2">{o.label} for {ago(o.status_at).replace(" ago", "")} · {o.delivery.lga}</span></span>
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              ))}
              {s.late.length > 5 && <li><Link href="/admin/orders" className="block py-1 text-center text-sm font-semibold underline">and {s.late.length - 5} more</Link></li>}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-mint-tint p-4 text-sm"><Icon name="check" className="text-mint-deep" />Nothing late. All orders are moving.</div>
          )}
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {s.status.map((x) => (
              <Link key={x.status} href={`/admin/orders?status=${x.status}`} className="rounded-xl bg-haze p-2 text-center hover:bg-mint-tint">
                <p className="num text-xl font-light">{x.n}</p><p className="text-[10px] font-semibold leading-tight text-mute">{x.label.split(":")[0]}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Week by week" sub="Monday to Sunday. The latest week is still running.">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-2 font-semibold">Week of</th><th className="py-2 text-right font-semibold">Sales</th><th className="py-2 text-right font-semibold">Orders</th><th className="py-2 text-right font-semibold">Visitors</th><th className="py-2 text-right font-semibold">Paid</th><th className="px-5 py-2 text-right font-semibold">Leads</th></tr></thead>
            <tbody>
              {[...s.weekly].reverse().map((w) => (
                <tr key={w.week} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-medium">{new Date(w.week + "T12:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
                  <td className="num py-2.5 text-right font-semibold">{naira(w.revenue)}</td><td className="num py-2.5 text-right">{w.orders}</td>
                  <td className="num py-2.5 text-right">{w.visitors.toLocaleString()}</td><td className="num py-2.5 text-right">{pct(w.conversion)}</td><td className="num px-5 py-2.5 text-right">{w.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Sales by brand"><Bars rows={s.brands.map((b) => ({ label: b.brand, value: b.amount }))} format={naira} empty="No sales in this period." /></Panel>
        <Panel title="Top pages"><Bars rows={s.topPages.map((p) => ({ label: p.path, value: p.n }))} format={(n) => n.toLocaleString()} empty="Visits will show here." /></Panel>
        <Panel title="Most clicked"><Bars rows={s.topClicks.map((p) => ({ label: p.name, value: p.n }))} format={(n) => n.toLocaleString()} empty="Clicks will show here." /></Panel>
        <Panel title="Where visitors came from"><Bars rows={s.sources.map((p) => ({ label: p.ref, value: p.n }))} format={(n) => n.toLocaleString()} empty="Sources will show here." /></Panel>
      </div>

      <Link href="/admin/pools" className="flex items-center gap-4 rounded-3xl bg-night p-5 text-white">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-ink"><Icon name="megaphone" /></span>
        <span className="flex-1"><span className="block font-semibold">{s.pools.open} Go Solar Me pages open</span><span className="text-sm text-white/60">{naira(s.pools.raising)} raised so far on open pages</span></span>
        <Icon name="arrow" className="text-mint" />
      </Link>
    </div>
  );
}
