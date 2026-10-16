import "server-only";
import { createHash } from "node:crypto";
import { brands, products } from "@/lib/catalog";
import { ALL_TIERS } from "@/data/packages";
import { abs } from "@/lib/seo";
import { db } from "./db";
import { getBuild } from "./social";
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
