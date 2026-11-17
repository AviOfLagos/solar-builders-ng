import "server-only";
import { createHash } from "node:crypto";
import { brands, products } from "@/lib/catalog";
import { ALL_TIERS } from "@/data/packages";
import { abs } from "@/lib/seo";
import { HttpError } from "./api";
import { code, db } from "./db";
import { getBuild } from "./social";
import { checkCart, compactItems, deliveryJson, priceCart, storedItems, validateDelivery, assertValid } from "./rules";
import { insertOrder } from "./ledger";
import { startCheckout } from "./orders";
import { paymentsOpen } from "./switch";
import { paystackConfigured } from "./paystack";
import { readSizingInput, sizeAndRecommend } from "./quote";

/**
 * Read-only catalogue for the WhatsApp ops agent (solar-ops-agent #14). Prices are the same selling prices the
 * product pages show (src/data/products.json, priced at build time). Costs never leave the store.
 *
 * Stock and lead times aren't tracked yet, so inStock and leadTimeDays are null. supplierIds lists the active
 * suppliers that carry the product's brand (a supplier with no brands listed carries everything).
 */
export async function agentCatalog() {
  const sql = await db();
  const suppliers = (await sql`select id, brands from suppliers where active order by name`) as unknown as { id: string; brands: string[] | null }[];
  const supplierIds = (brand: string) => suppliers.filter((s) => !s.brands?.length || s.brands.includes(brand)).map((s) => s.id);

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    brandName: brands.find((b) => b.slug === p.brand)?.name ?? p.brand,
    category: p.category,
    specs: p.specs,
    price: p.price,
    active: true,
    inStock: null as boolean | null,
    leadTimeDays: null as number | null,
    url: abs(`/product/${p.slug}`),
    supplierIds: supplierIds(p.brand),
  }));
  const packages = ALL_TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    segment: t.segment.slug,
    kw: t.kw,
    kwh: t.kwh,
    install: t.install,
    price: t.price,
    items: t.items.map((i) => ({ id: t.lines.find((l) => l.p.slug === i.slug)!.p.id, qty: i.qty })),
  }));
  // Changes whenever a price, product or package changes, so the agent can tell a fresh copy from a stale one.
  const version = createHash("sha256").update(JSON.stringify({ items, packages })).digest("hex").slice(0, 16);
  return { version, currency: "NGN", generatedAt: new Date().toISOString(), brands: brands.map(({ slug, name }) => ({ slug, name })), products: items, packages };
}

/** A shared build (/b/{id}) re-priced at today's prices, as the build page shows it. */
export const agentBuild = (id: string) => getBuild(id, false);

/** The site's sizing calculator (/api/v1/size), so the agent sizes exactly like the planner. */
export const agentSize = (input: Record<string, unknown>) => sizeAndRecommend(readSizingInput(input));

/**
 * Recent orders for the ops console (solar-ops-agent #77), newest first: status, payments, POs with their
 * suppliers, and the installer job. Read-only. `source` filters, e.g. "whatsapp" for orders the agent created.
 */
export async function agentOrders(input: { source?: string; limit?: number }) {
  const sql = await db();
  const limit = Math.min(200, Math.max(1, Math.trunc(Number(input.limit) || 50)));
  const source = typeof input.source === "string" && input.source ? input.source.slice(0, 30) : null;
  const rows = await sql`
    select o.id, o.status, o.status_at as "statusAt", o.created_at as "createdAt", o.source,
           o.total_paid as "totalPaid", o.refunded, o.installer as "needsInstall",
           coalesce(o.buyer->>'name', '') as buyer,
           coalesce((select json_agg(json_build_object('id', p.id, 'supplier', s.name, 'status', p.status,
                                                        'confirmedAt', p.confirmed_at, 'deliveredAt', p.delivered_at) order by p.created_at)
                     from purchase_orders p left join suppliers s on s.id = p.supplier_id where p.order_id = o.id), '[]') as pos,
           (select json_build_object('installer', i.name, 'status', j.status, 'jobDate', j.job_date)
              from order_jobs j left join installers i on i.id = j.installer_id where j.order_id = o.id) as job
    from orders o
    where (${source}::text is null or o.source = ${source})
    order by o.created_at desc
    limit ${limit}`;
  return { orders: rows };
}

type BuildInput = Record<string, unknown>;

const s200 = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
const meta = (b: BuildInput, version: number) => ({
  source: "whatsapp-agent",
  version,
  site: b.site && typeof b.site === "object" ? b.site : {},
  validUntil: typeof b.validUntil === "string" && !Number.isNaN(Date.parse(b.validUntil)) ? b.validUntil : null,
  conversationRef: s200(b.conversationRef, 60),
});

/**
 * A quote from the WhatsApp agent as a store build (solar-ops-agent #29): the same shareable /b/{id} page,
 * priced by the store (never by the agent). Returns the link and the store's total.
 */
export async function agentBuildCreate(b: BuildInput) {
  const cart = priceCart(b.items);
  if (!cart.lines.length) throw new HttpError(400, "No catalogue items in this quote.");
  const sql = await db();
  const id = code();
  await sql`insert into builds ${sql({ id, title: s200(b.title, 80), note: s200(b.note, 500), items: sql.json(storedItems(cart.lines)), meta: sql.json(meta(b, 1) as never) })}`;
  return { id, path: `/b/${id}`, url: abs(`/b/${id}`), total: cart.total, version: 1 };
}

/** A new version of an agent-created build (same link). Builds people made on the site can't be changed here. */
export async function agentBuildUpdate(b: BuildInput) {
  const id = s200(b.buildId, 16);
  const cart = priceCart(b.items);
  if (!cart.lines.length) throw new HttpError(400, "No catalogue items in this quote.");
  const sql = await db();
  const [row] = await sql`
    update builds set items = ${sql.json(storedItems(cart.lines))}, note = coalesce(${b.note === undefined ? null : s200(b.note, 500)}, note),
      meta = jsonb_set(meta, '{version}', to_jsonb(coalesce((meta->>'version')::int, 1) + 1))
        || jsonb_strip_nulls(jsonb_build_object('site', ${b.site && typeof b.site === "object" ? sql.json(b.site as never) : null}::jsonb,
                                                 'validUntil', ${meta(b, 0).validUntil}::text))
    where id = ${id} and meta->>'source' = 'whatsapp-agent'
    returning (meta->>'version')::int as version`;
  if (!row) throw new HttpError(404, "No agent-created build with that id.");
  return { id, path: `/b/${id}`, url: abs(`/b/${id}`), total: cart.total, version: row.version as number };
}

/** No email from a WhatsApp customer: Paystack needs one, so receipts go to the ops mailbox, tagged by phone. */
const fallbackEmail = (phone: string) => `solar+wa${phone.replace(/\D/g, "")}@nexprove.com`;

/**
 * An order from an agent-created build (solar-ops-agent #34). The store prices it (never the agent), it's
 * idempotent on the build id, and when payments are switched off it's recorded as `reserved` for a person to
 * confirm before any money moves. Delivery follows the store's checkout rules (Lagos LGAs).
 */
export async function agentOrderCreate(b: Record<string, unknown>, origin: string) {
  const buildId = s200(b.buildId, 16);
  const sql = await db();
  const [build] = await sql`select id, items from builds where id = ${buildId} and meta->>'source' = 'whatsapp-agent'`;
  if (!build) throw new HttpError(404, "No agent-created build with that id.");
  const [existing] = await sql`select id, status, total_paid, agent_pay_url from orders where agent_build_id = ${buildId}`;
  if (existing) return { ref: existing.id as string, status: existing.status as string, total: existing.total_paid as number, payUrl: (existing.agent_pay_url as string | null) ?? null, existing: true };

  const cart = priceCart(build.items);
  checkCart(cart, "This quote has no items we sell any more.");
  const phone = s200(b.phone, 20);
  const fields = {
    name: s200(b.name, 80), email: s200(b.email, 120) || fallbackEmail(phone), phone, altPhone: s200(b.altPhone, 20),
    address: s200(b.address, 300), lga: s200(b.lga, 40), landmark: s200(b.landmark, 120), notes: s200(b.notes, 300),
    installer: b.installer === true,
    forSomeoneElse: Boolean(b.recipientName), recipientName: s200(b.recipientName, 80), recipientPhone: s200(b.recipientPhone, 20),
  };
  const { values, errors } = validateDelivery(fields);
  assertValid(errors);

  if (!(await paymentsOpen()) || !paystackConfigured()) {
    const o = await sql.begin((tx) =>
      insertOrder(tx, {
        items: tx.json(compactItems(cart.lines)), subtotal: cart.subtotal, total_paid: cart.total, commission: 0,
        buyer: tx.json({ name: values.name, email: values.email, phone: values.phone }),
        delivery: tx.json(deliveryJson(values)),
        recipient: values.forSomeoneElse ? tx.json({ name: values.recipientName, phone: values.recipientPhone }) : null,
        installer: values.installer, status: "reserved", source: "whatsapp", agent_build_id: buildId,
      }),
    );
    return { ref: o.id, status: "reserved", total: cart.total, payUrl: null, existing: false };
  }

  const r = await startCheckout({ ...fields, items: storedItems(cart.lines), provider: "paystack", expectedTotal: cart.total }, null, origin, { source: "whatsapp" });
  const payUrl = "authorizationUrl" in r ? (r.authorizationUrl ?? null) : null;
  await sql`update orders set agent_build_id = ${buildId}, agent_pay_url = ${payUrl} where id = ${r.ref}`;
  return { ref: r.ref, status: "awaiting_payment", total: r.amount, payUrl, existing: false };
}

export async function agentOrderRead(ref: string) {
  const sql = await db();
  const [o] = await sql`select id as ref, status, status_at as "statusAt", total_paid as total, refunded, source, agent_build_id as "buildId",
                               agent_pay_url as "payUrl", installer as "needsInstall", created_at as "createdAt"
                        from orders where id = ${ref.slice(0, 20)}`;
  return o ?? null;
}

export async function agentPaymentsState() {
  return { open: await paymentsOpen(), paystack: paystackConfigured() };
}
