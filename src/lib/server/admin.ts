import "server-only";
import { db } from "./db";
import { FULFILMENT, ORDER_STATUS, type OrderStatus } from "@/config/store";
import { getProductById, brandName } from "@/lib/catalog";

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Everything the admin overview shows, for the last `days` days against the `days` before. */
export async function adminStats(days: number) {
  const sql = await db();
  const now = new Date();
  const from = new Date(now.getTime() - days * 864e5);
  const prevFrom = new Date(now.getTime() - 2 * days * 864e5);

  const orders = await sql`select id, items, total_paid, gift_card_used, status, created_at from orders
    where status = any(${FULFILMENT}) and created_at >= ${prevFrom}`;
  const cur = orders.filter((o) => new Date(o.created_at) >= from);
  const prev = orders.filter((o) => new Date(o.created_at) < from);
  const money = (list: readonly Record<string, unknown>[]) => list.reduce<number>((s, o) => s + Number(o.total_paid) + Number(o.gift_card_used), 0);

  const [visits] = await sql`select
      count(distinct sid) filter (where at >= ${from})::int as cur,
      count(distinct sid) filter (where at < ${from})::int as prev,
      count(*) filter (where at >= ${from} and kind = 'view')::int as views
    from events where at >= ${prevFrom} and sid <> ''`;
  const [leads] = await sql`select count(*) filter (where created_at >= ${from})::int as cur, count(*) filter (where created_at < ${from})::int as prev
    from leads where created_at >= ${prevFrom}`;
  const [pools] = await sql`select count(*) filter (where status = 'open')::int as open, coalesce(sum(raised) filter (where status = 'open'), 0)::int as raising from pools`;

  // Daily series
  const series = new Map<string, { date: string; revenue: number; orders: number; visitors: number }>();
  for (let t = from.getTime(); t <= now.getTime(); t += 864e5) { const k = day(new Date(t)); series.set(k, { date: k, revenue: 0, orders: 0, visitors: 0 }); }
  for (const o of cur) { const r = series.get(day(new Date(o.created_at))); if (r) { r.revenue += o.total_paid + o.gift_card_used; r.orders++; } }
  const v = await sql`select to_char(date_trunc('day', at), 'YYYY-MM-DD') as d, count(distinct sid)::int as n from events where at >= ${from} and sid <> '' group by 1`;
  for (const x of v) { const r = series.get(x.d); if (r) r.visitors = x.n; }

  // Funnel: tabs that reached each step
  const [f] = await sql`select
      count(distinct sid)::int as visited,
      count(distinct sid) filter (where path in ('/find', '/start') or path like '/packages%')::int as explored,
      count(distinct sid) filter (where path = '/kit' or path like '/product/%')::int as picked,
      count(distinct sid) filter (where path like '/checkout%' and path <> '/checkout/success')::int as checkout
    from events where at >= ${from} and sid <> '' and kind = 'view'`;
  const funnel = [
    { step: "Visited", n: f.visited },
    { step: "Looked for a kit", n: f.explored },
    { step: "Picked a kit", n: f.picked },
    { step: "Started checkout", n: f.checkout },
    { step: "Paid", n: cur.length },
  ];

  const topPages = await sql`select path, count(*)::int as n from events where at >= ${from} and kind = 'view' group by 1 order by 2 desc limit 8`;
  const topClicks = await sql`select name, count(*)::int as n from events where at >= ${from} and kind = 'click' group by 1 order by 2 desc limit 8`;
  const sources = await sql`select coalesce(nullif(split_part(utm, '|', 1), ''), nullif(ref, ''), 'Direct') as ref, count(distinct sid)::int as n from events where at >= ${from} and kind = 'view' group by 1 order by 2 desc limit 6`;

  // Sales by brand
  const byBrand = new Map<string, number>();
  for (const o of cur) for (const it of o.items as { id: string; qty: number; price?: number }[]) {
    const p = getProductById(it.id);
    if (!p) continue;
    byBrand.set(p.brand, (byBrand.get(p.brand) ?? 0) + (it.price ?? p.price) * it.qty);
  }
  const brands = [...byBrand].map(([slug, amount]) => ({ brand: brandName(slug), amount })).sort((a, b) => b.amount - a.amount);

  const statusRows = await sql`select status, count(*)::int as n from orders where status = any(${FULFILMENT}) group by 1`;
  const status = FULFILMENT.map((s) => ({ status: s, label: ORDER_STATUS[s], n: statusRows.find((r) => r.status === s)?.n ?? 0 }));
  const late = await sql`select id, status, status_at, created_at, recipient, buyer, delivery from orders
    where (status = 'pending' and status_at < now() - interval '24 hours') or (status in ('confirmed', 'out_for_delivery') and status_at < now() - interval '48 hours')
    order by status_at asc limit 10`;
  const recent = await sql`select id, items, total_paid, gift_card_used, status, buyer, delivery, created_at from orders
    where status not in ('awaiting_payment', 'expired') order by created_at desc limit 8`;

  const revenue = money(cur), prevRevenue = money(prev);
  return {
    days,
    kpis: {
      revenue: { value: revenue, prev: prevRevenue },
      orders: { value: cur.length, prev: prev.length },
      average: { value: cur.length ? Math.round(revenue / cur.length) : 0, prev: prev.length ? Math.round(prevRevenue / prev.length) : 0 },
      visitors: { value: visits.cur, prev: visits.prev },
      conversion: { value: visits.cur ? cur.length / visits.cur : 0, prev: visits.prev ? prev.length / visits.prev : 0 },
      leads: { value: leads.cur, prev: leads.prev },
    },
    views: visits.views,
    pools,
    series: [...series.values()],
    funnel,
    weekly: await weeklyNumbers(8),
    topPages,
    topClicks,
    sources,
    brands,
    status,
    late: late.map((o) => ({ ...o, label: ORDER_STATUS[o.status as OrderStatus] })),
    recent: recent.map((o) => ({ ...o, label: ORDER_STATUS[o.status as OrderStatus], count: (o.items as { qty: number }[]).reduce((n, i) => n + i.qty, 0), first: getProductById((o.items as { id: string }[])[0]?.id)?.name ?? "" })),
  };
}

export async function adminOrders(status: string, q: string) {
  const sql = await db();
  const like = `%${q.toLowerCase()}%`;
  const rows = await sql`select id, items, subtotal, total_paid, gift_card_used, commission, buyer, delivery, recipient, installer, status, status_at, pool_id, source, created_at
    from orders where status not in ('awaiting_payment', 'expired')
      and (${status} = '' or status = ${status})
      and (${q} = '' or lower(id) like ${like} or lower(buyer->>'name') like ${like} or lower(buyer->>'phone') like ${like} or lower(coalesce(recipient->>'name', '')) like ${like})
    order by created_at desc limit 200`;
  return rows.map((o) => ({
    ...o,
    label: ORDER_STATUS[o.status as OrderStatus],
    lines: (o.items as { id: string; qty: number; price?: number }[]).map((i) => ({ ...i, name: getProductById(i.id)?.name ?? i.id, brand: brandName(getProductById(i.id)?.brand ?? "") })),
  }));
}

export const LEAD_STATUS = ["new", "contacted", "engaged", "ready_to_buy", "paid", "lost"] as const;

export async function adminLeads(status: string) {
  const sql = await db();
  const rows = await sql`select id, name, phone, email, consent, source, items, total, note, status, contacted_at, created_at, updated_at, order_id
    from leads where (${status} = '' or status = ${status}) order by updated_at desc limit 300`;
  return rows;
}

export async function adminPools() {
  const sql = await db();
  return sql`select p.id, p.kind, p.title, p.goal, p.raised, p.status, p.deadline, p.created_at, u.name as owner, u.email as owner_email,
      (select count(*)::int from contributions c where c.pool_id = p.id and c.status = 'paid') as supporters
    from pools p join users u on u.id = p.user_id order by p.created_at desc limit 200`;
}

/** The last `weeks` weeks (Monday to Sunday, Lagos is UTC+1 so UTC weeks are close enough), newest last. */
export async function weeklyNumbers(weeks = 8) {
  const sql = await db();
  const rows = await sql`
    with w as (select generate_series(date_trunc('week', now()) - ((${weeks} - 1) * interval '1 week'), date_trunc('week', now()), interval '1 week') as start)
    select to_char(w.start, 'YYYY-MM-DD') as week,
      (select count(distinct sid)::int from events e where e.at >= w.start and e.at < w.start + interval '1 week' and e.sid <> '') as visitors,
      (select count(*)::int from orders o where o.status = any(${FULFILMENT}) and o.created_at >= w.start and o.created_at < w.start + interval '1 week') as orders,
      (select coalesce(sum(o.total_paid + o.gift_card_used), 0)::bigint from orders o where o.status = any(${FULFILMENT}) and o.created_at >= w.start and o.created_at < w.start + interval '1 week') as revenue,
      (select count(*)::int from leads l where l.created_at >= w.start and l.created_at < w.start + interval '1 week') as leads
    from w order by w.start`;
  return rows.map((r) => ({ week: r.week as string, visitors: r.visitors as number, orders: r.orders as number, revenue: Number(r.revenue), leads: r.leads as number, conversion: r.visitors ? Math.min(1, (r.orders as number) / (r.visitors as number)) : 0 }));
}

/** The Monday message: last full week against the one before it. */
export async function weeklyDigest() {
  const w = await weeklyNumbers(3);
  const [cur, prev] = [w[w.length - 2], w[w.length - 3]];
  if (!cur) return "";
  const d = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : a ? "new" : "-");
  const n = (v: number) => `₦${v.toLocaleString("en-NG")}`;
  return [
    `WEEK OF ${cur.week}`,
    `Sales ${n(cur.revenue)} (${d(cur.revenue, prev?.revenue ?? 0)}) · ${cur.orders} paid orders (${d(cur.orders, prev?.orders ?? 0)})`,
    `Visitors ${cur.visitors} (${d(cur.visitors, prev?.visitors ?? 0)}) · ${(cur.conversion * 100).toFixed(1)}% paid · ${cur.leads} new leads`,
    `Open the dashboard: ${process.env.SITE_URL || "https://solar.nexprove.com"}/admin`,
  ].join("\n");
}
