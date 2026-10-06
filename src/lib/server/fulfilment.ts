import "server-only";
import { db, id } from "./db";
import { HttpError } from "./api";
import { esc, sendMail, shell } from "./mail";
import { getProductById } from "@/lib/catalog";
import costs from "../../../data/catalog-costs.json";

const COST = new Map(costs.products.map((p) => [p.id, p.costNgn]));
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

export const PO_STATUS = ["draft", "sent", "confirmed", "delivered", "cancelled"] as const;
export const JOB_STATUS = ["assigned", "accepted", "scheduled", "done", "declined"] as const;
/** Hours before we shout. */
export const LATE = { poUnconfirmed: 4, poUndelivered: 48, noPo: 2 };

type Item = { id: string; qty: number; price?: number };
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : 0; };

// ---- suppliers and installers ----

export async function listSuppliers() {
  const sql = await db();
  return sql`select s.*, (select count(*)::int from purchase_orders p where p.supplier_id = s.id) as pos from suppliers s order by active desc, name`;
}

export async function saveSupplier(b: Record<string, unknown>) {
  const sql = await db();
  const name = clean(b.name, 80);
  if (name.length < 2) throw new HttpError(400, "Add the supplier's name.");
  const brands = Array.isArray(b.brands) ? b.brands.map((x) => clean(x, 40)).filter(Boolean).slice(0, 30) : [];
  const f = { name, email: clean(b.email, 120), phone: clean(b.phone, 30), notes: clean(b.notes, 500), active: b.active !== false };
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) throw new HttpError(400, "That email doesn't look right.");
  if (b.id) {
    const [r] = await sql`update suppliers set name = ${f.name}, email = ${f.email}, phone = ${f.phone}, notes = ${f.notes}, active = ${f.active}, brands = ${brands} where id = ${String(b.id)} returning id`;
    if (!r) throw new HttpError(404, "Supplier not found.");
    return r.id as string;
  }
  const sid = id();
  await sql`insert into suppliers (id, name, email, phone, notes, active, brands) values (${sid}, ${f.name}, ${f.email}, ${f.phone}, ${f.notes}, ${f.active}, ${brands})`;
  return sid;
}

export async function listInstallers() {
  const sql = await db();
  return sql`select i.*, (select count(*)::int from order_jobs j where j.installer_id = i.id) as jobs,
      (select count(*)::int from order_jobs j where j.installer_id = i.id and j.status = 'done') as done
    from installers i order by active desc, name`;
}

export async function saveInstaller(b: Record<string, unknown>) {
  const sql = await db();
  const name = clean(b.name, 80);
  if (name.length < 2) throw new HttpError(400, "Add the installer's name.");
  const f = { name, phone: clean(b.phone, 30), email: clean(b.email, 120), areas: clean(b.areas, 200), rate: money(b.rate), notes: clean(b.notes, 500), active: b.active !== false };
  if (b.id) {
    const [r] = await sql`update installers set name = ${f.name}, phone = ${f.phone}, email = ${f.email}, areas = ${f.areas}, rate = ${f.rate}, notes = ${f.notes}, active = ${f.active} where id = ${String(b.id)} returning id`;
    if (!r) throw new HttpError(404, "Installer not found.");
    return r.id as string;
  }
  const iid = id();
  await sql`insert into installers (id, name, phone, email, areas, rate, notes, active) values (${iid}, ${f.name}, ${f.phone}, ${f.email}, ${f.areas}, ${f.rate}, ${f.notes}, ${f.active})`;
  return iid;
}

// ---- purchase orders ----

type PoItem = { id: string; name: string; brand: string; qty: number; cost: number };

async function getOrder(orderId: string) {
  const sql = await db();
  const [o] = await sql`select id, items, buyer, delivery, recipient, installer, status from orders where id = ${orderId}`;
  if (!o) throw new HttpError(404, "Order not found.");
  return o;
}

/** A purchase order for the part of an order this supplier stocks (all of it when their brands are blank). */
export async function createPO(orderId: string, supplierId: string, opts: { shipTo?: string; deliveryCost?: unknown; note?: unknown }, by: string) {
  const sql = await db();
  const o = await getOrder(orderId);
  const [s] = await sql`select id, brands from suppliers where id = ${supplierId} and active`;
  if (!s) throw new HttpError(404, "Pick an active supplier.");
  const brands = s.brands as string[];
  const items: PoItem[] = (o.items as Item[]).flatMap((it) => {
    const p = getProductById(it.id);
    if (!p || (brands.length && !brands.includes(p.brand))) return [];
    return [{ id: it.id, name: p.name, brand: p.brand, qty: it.qty, cost: COST.get(it.id) ?? 0 }];
  });
  if (!items.length) throw new HttpError(400, "None of this order's items are from that supplier's brands.");
  const cost = items.reduce((n, i) => n + i.cost * i.qty, 0);
  const pid = "PO-" + id().slice(0, 6).toUpperCase();
  await sql`insert into purchase_orders (id, order_id, supplier_id, items, cost, delivery_cost, ship_to, note, created_by)
    values (${pid}, ${orderId}, ${supplierId}, ${sql.json(items)}, ${cost}, ${money(opts.deliveryCost)}, ${opts.shipTo === "customer" ? "customer" : "us"}, ${clean(opts.note, 500)}, ${by})`;
  return pid;
}

/** The message a supplier gets. Customer details are included only when the PO ships to the customer. */
export async function poMessage(poId: string) {
  const sql = await db();
  const [p] = await sql`select p.*, s.name as supplier, s.email as s_email, s.phone as s_phone from purchase_orders p left join suppliers s on s.id = p.supplier_id where p.id = ${poId}`;
  if (!p) throw new HttpError(404, "Purchase order not found.");
  const o = await getOrder(p.order_id);
  const items = p.items as PoItem[];
  const to = o.recipient ?? o.buyer;
  const where = p.ship_to === "customer"
    ? `Deliver to the customer: ${to.name}, ${o.delivery.phone || to.phone}. ${o.delivery.address || ""}${o.delivery.landmark ? ", near " + o.delivery.landmark : ""}, ${o.delivery.lga}.`
    : `Deliver to Solar Builders NG (Nexprove Limited), Lagos. We will confirm the drop-off point.`;
  const lines = items.map((i) => `${i.qty} x ${i.name} at ${naira(i.cost)} each`);
  const text = [
    `Hello ${p.supplier || ""},`, "",
    `Purchase order ${p.id} from Solar Builders NG:`, ...lines.map((l) => "- " + l), "",
    `Total: ${naira(p.cost)}`, where,
    p.note ? `Note: ${p.note}` : "",
    "", "Please reply to confirm stock, price and the day we can expect delivery. Thank you.",
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
  const html = shell(`Purchase order ${p.id}`, `<p>Hello ${esc(p.supplier || "")},</p><p>Purchase order <b>${esc(p.id)}</b> from Solar Builders NG:</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><b>Total: ${esc(naira(p.cost))}</b></p><p>${esc(where)}</p>${p.note ? `<p>Note: ${esc(p.note)}</p>` : ""}<p>Please reply to confirm stock, price and the day we can expect delivery.</p>`);
  const phone = String(p.s_phone || "").replace(/\D/g, "").replace(/^0/, "234");
  return { po: p, text, html, email: String(p.s_email || ""), wa: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : "" };
}

export async function sendPO(poId: string, channel: "email" | "manual") {
  const sql = await db();
  const m = await poMessage(poId);
  if (m.po.status === "cancelled" || m.po.status === "delivered") throw new HttpError(409, "This purchase order is already closed.");
  if (channel === "email") {
    if (!m.email) throw new HttpError(400, "This supplier has no email. Add one, or send it on WhatsApp.");
    const r = await sendMail({ to: [m.email], subject: `Purchase order ${poId} from Solar Builders NG`, html: m.html, text: m.text });
    if (!r.ok) throw new HttpError(502, r.off ? "Email isn't set up yet. Use the WhatsApp message, then mark it as sent." : "The email didn't go through. Try again or use WhatsApp.");
  }
  await sql`update purchase_orders set status = case when status = 'draft' then 'sent' else status end, sent_at = coalesce(sent_at, now()) where id = ${poId}`;
  return m;
}

export async function updatePO(poId: string, b: Record<string, unknown>) {
  const sql = await db();
  const status = clean(b.status, 20);
  if (status && !(PO_STATUS as readonly string[]).includes(status)) throw new HttpError(400, "Unknown status.");
  const expected = clean(b.expectedAt, 10);
  if (expected && !/^\d{4}-\d{2}-\d{2}$/.test(expected)) throw new HttpError(400, "Use a date like 2026-10-20.");
  const [r] = await sql`update purchase_orders set
      status = coalesce(${status || null}, status),
      confirmed_at = case when ${status} = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
      delivered_at = case when ${status} = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      sent_at = case when ${status} in ('confirmed', 'delivered') then coalesce(sent_at, now()) else sent_at end,
      expected_at = coalesce(${expected || null}::date, expected_at),
      delivery_cost = case when ${b.deliveryCost === undefined} then delivery_cost else ${money(b.deliveryCost)} end,
      cost = case when ${b.cost === undefined} then cost else ${money(b.cost)} end,
      note = case when ${b.note === undefined} then note else ${clean(b.note, 500)} end
    where id = ${poId} returning id`;
  if (!r) throw new HttpError(404, "Purchase order not found.");
}

// ---- installer jobs ----

export async function assignJob(orderId: string, installerId: string, b: Record<string, unknown>) {
  const sql = await db();
  await getOrder(orderId);
  const [i] = await sql`select id, rate from installers where id = ${installerId} and active`;
  if (!i) throw new HttpError(404, "Pick an active installer.");
  const date = clean(b.jobDate, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Use a date like 2026-10-20.");
  const fee = b.fee === undefined || b.fee === "" ? i.rate : money(b.fee);
  await sql`insert into order_jobs (id, order_id, installer_id, fee, job_date, status) values (${id()}, ${orderId}, ${installerId}, ${fee}, ${date || null}::date, ${date ? "scheduled" : "assigned"})
    on conflict (order_id) do update set installer_id = excluded.installer_id, fee = excluded.fee, job_date = excluded.job_date, status = excluded.status, assigned_at = now(), completed_at = null`;
}

export async function updateJob(orderId: string, b: Record<string, unknown>) {
  const sql = await db();
  const status = clean(b.status, 20);
  if (status && !(JOB_STATUS as readonly string[]).includes(status)) throw new HttpError(400, "Unknown status.");
  const date = clean(b.jobDate, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Use a date like 2026-10-20.");
  const photo = clean(b.photoUrl, 400);
  if (photo && !/^https:\/\//.test(photo)) throw new HttpError(400, "The photo link must start with https://");
  const [r] = await sql`update order_jobs set
      status = coalesce(${status || null}, status),
      completed_at = case when ${status} = 'done' then coalesce(completed_at, now()) else completed_at end,
      job_date = coalesce(${date || null}::date, job_date),
      fee = case when ${b.fee === undefined} then fee else ${money(b.fee)} end,
      photo_url = case when ${b.photoUrl === undefined} then photo_url else ${photo} end,
      note = case when ${b.note === undefined} then note else ${clean(b.note, 500)} end
    where order_id = ${orderId} returning order_id`;
  if (!r) throw new HttpError(404, "No installer is assigned to this order yet.");
}

// ---- one order's fulfilment, with its margin ----

export async function orderFulfilment(orderId: string) {
  const sql = await db();
  const o = await getOrder(orderId);
  const [full] = await sql`select subtotal, total_paid, gift_card_used, commission from orders where id = ${orderId}`;
  const pos = await sql`select p.*, s.name as supplier from purchase_orders p left join suppliers s on s.id = p.supplier_id where p.order_id = ${orderId} order by p.created_at`;
  const [job] = await sql`select j.*, i.name as installer, i.phone as installer_phone from order_jobs j left join installers i on i.id = j.installer_id where j.order_id = ${orderId}`;
  return { pos, job: job ?? null, margin: margin(o.items as Item[], full, pos, job), installerRequested: !!o.installer };
}

/**
 * What we kept: what the customer paid for goods, less what the goods cost us (the real PO when one
 * exists, otherwise the brand's list price), delivery we paid, the installer's fee and seller commission.
 */
function margin(items: Item[], o: Record<string, unknown>, pos: Record<string, unknown>[], job?: Record<string, unknown>) {
  const revenue = items.reduce((n, i) => n + (i.price ?? getProductById(i.id)?.price ?? 0) * i.qty, 0);
  const live = pos.filter((p) => p.status !== "cancelled");
  const listCost = items.reduce((n, i) => n + (COST.get(i.id) ?? 0) * i.qty, 0);
  const goods = live.length ? live.reduce((n, p) => n + Number(p.cost), 0) : listCost;
  const delivery = live.reduce((n, p) => n + Number(p.delivery_cost), 0);
  const install = job && job.status !== "declined" ? Number(job.fee) : 0;
  const commission = Number(o.commission ?? 0);
  const profit = revenue - goods - delivery - install - commission;
  return { revenue, goods, delivery, install, commission, profit, pct: revenue ? profit / revenue : 0, estimated: !live.length };
}

// ---- late flags (shown on the dashboard) ----

export async function fulfilmentFlags() {
  const sql = await db();
  const h = (n: number) => `${n} hours`;
  const unconfirmed = await sql`select p.id, p.order_id, s.name as supplier, p.sent_at from purchase_orders p left join suppliers s on s.id = p.supplier_id
    where p.status = 'sent' and p.sent_at < now() - ${h(LATE.poUnconfirmed)}::interval order by p.sent_at limit 20`;
  const undelivered = await sql`select p.id, p.order_id, s.name as supplier, p.confirmed_at from purchase_orders p left join suppliers s on s.id = p.supplier_id
    where p.status in ('sent', 'confirmed') and coalesce(p.confirmed_at, p.sent_at) < now() - ${h(LATE.poUndelivered)}::interval order by 4 limit 20`;
  const noPo = await sql`select o.id, o.status_at from orders o where o.status in ('pending', 'confirmed')
    and o.status_at < now() - ${h(LATE.noPo)}::interval and not exists (select 1 from purchase_orders p where p.order_id = o.id and p.status <> 'cancelled') order by o.status_at limit 20`;
  const noInstaller = await sql`select o.id, o.status_at from orders o where o.installer and o.status in ('confirmed', 'out_for_delivery', 'delivered')
    and not exists (select 1 from order_jobs j where j.order_id = o.id and j.status <> 'declined') order by o.status_at limit 20`;
  const flags = [
    ...noPo.map((r) => ({ kind: "no_po", orderId: r.id as string, text: `${r.id}: paid, no purchase order yet`, at: r.status_at as string })),
    ...unconfirmed.map((r) => ({ kind: "po_unconfirmed", orderId: r.order_id as string, text: `${r.id}: ${r.supplier ?? "supplier"} hasn't confirmed`, at: r.sent_at as string })),
    ...undelivered.map((r) => ({ kind: "po_late", orderId: r.order_id as string, text: `${r.id}: ${r.supplier ?? "supplier"} hasn't delivered`, at: (r.confirmed_at ?? r.sent_at) as string })),
    ...noInstaller.map((r) => ({ kind: "no_installer", orderId: r.id as string, text: `${r.id}: installer requested, none assigned`, at: r.status_at as string })),
  ];
  return flags;
}

// ---- commission payouts ----

export async function payouts() {
  const sql = await db();
  const rows = await sql`select o.id, o.commission, o.status as order_status, o.created_at, st.name as seller, st.slug, st.whatsapp, u.email as seller_email,
      coalesce(c.status, case when o.status in ('delivered', 'installed') then 'approved' else 'earned' end) as status, c.paid_at, coalesce(c.ref, '') as ref
    from orders o join stores st on st.id = o.store_id join users u on u.id = st.user_id
    left join commission_payouts c on c.order_id = o.id
    where o.commission > 0 and o.status = any(${["pending", "confirmed", "out_for_delivery", "delivered", "installed"]})
    order by o.created_at desc limit 500`;
  const sum = (s: string) => rows.filter((r) => r.status === s).reduce((n, r) => n + Number(r.commission), 0);
  return { rows, totals: { earned: sum("earned"), approved: sum("approved"), paid: sum("paid") } };
}

export async function markPayout(orderId: string, status: string, ref: string) {
  if (!["approved", "paid"].includes(status)) throw new HttpError(400, "Unknown status.");
  const sql = await db();
  const [o] = await sql`select commission, status from orders where id = ${orderId} and commission > 0`;
  if (!o) throw new HttpError(404, "No commission on that order.");
  if (status === "paid" && !["delivered", "installed"].includes(o.status)) throw new HttpError(409, "Pay commission after the order is delivered.");
  await sql`insert into commission_payouts (order_id, status, paid_at, ref) values (${orderId}, ${status}, ${status === "paid" ? new Date() : null}, ${clean(ref, 100)})
    on conflict (order_id) do update set status = excluded.status, paid_at = excluded.paid_at, ref = excluded.ref, updated_at = now()`;
}

export async function payoutsCsv() {
  const { rows } = await payouts();
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return ["order,seller,whatsapp,amount,status,paid_at,reference", ...rows.map((r) => [r.id, r.seller, r.whatsapp, r.commission, r.status, r.paid_at ? new Date(r.paid_at).toISOString() : "", r.ref].map(q).join(","))].join("\n");
}

/** Profit across paid orders in the last `days`, for the dashboard. */
export async function marginSummary(days: number) {
  const sql = await db();
  const orders = await sql`select id, items, commission from orders where status = any(${["pending", "confirmed", "out_for_delivery", "delivered", "installed"]}) and created_at >= now() - ${`${days} days`}::interval`;
  if (!orders.length) return { revenue: 0, profit: 0, pct: 0, orders: 0 };
  const ids = orders.map((o) => o.id as string);
  const pos = await sql`select * from purchase_orders where order_id = any(${ids})`;
  const jobs = await sql`select * from order_jobs where order_id = any(${ids})`;
  let revenue = 0, profit = 0;
  for (const o of orders) {
    const m = margin(o.items as Item[], o, pos.filter((p) => p.order_id === o.id), jobs.find((j) => j.order_id === o.id));
    revenue += m.revenue; profit += m.profit;
  }
  return { revenue, profit, pct: revenue ? profit / revenue : 0, orders: orders.length };
}

