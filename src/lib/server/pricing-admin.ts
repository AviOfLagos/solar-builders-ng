import "server-only";
import { db } from "./db";
import { HttpError } from "./api";
import costs from "../../../data/catalog-costs.json";
import pricing from "@/config/pricing.json";
import { priceFor, type Rules } from "../../../scripts/pricing-lib.mjs";
import { products as live, brands } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/categories";

const SCOPES = ["default", "floor", "brand", "category", "product"] as const;
type Scope = (typeof SCOPES)[number];

async function loadSaved(): Promise<Rules> {
  const sql = await db();
  const rows = await sql`select scope, key, markup, fixed from price_rules`;
  const r: Rules = { brand: {}, category: {}, productMarkup: {}, productFixed: {} };
  for (const x of rows) {
    if (x.scope === "default" && x.markup != null) r.default = x.markup;
    else if (x.scope === "floor" && x.markup != null) r.floor = x.markup;
    else if (x.scope === "brand" && x.markup != null) r.brand[x.key] = x.markup;
    else if (x.scope === "category" && x.markup != null) r.category[x.key] = x.markup;
    else if (x.scope === "product") {
      if (x.fixed != null) r.productFixed[x.key] = x.fixed;
      else if (x.markup != null) r.productMarkup[x.key] = x.markup;
    }
  }
  return r;
}

/** Saved rules, and what every product would sell for with them. Costs stay on the server. */
export async function pricingOverview() {
  const rules = await loadSaved();
  const livePrice = new Map(live.map((p) => [p.id, p.price]));
  const rows = costs.products.map((p) => {
    const x = priceFor(p, pricing, rules);
    const was = livePrice.get(p.id) ?? 0;
    return { id: p.id, name: p.name, brand: p.brand, category: p.category, cost: p.costNgn, price: x.price, live: was, markup: x.markup, floored: x.floored, fixed: x.fixed };
  });
  return {
    base: { markup: pricing.markup, floor: pricing.floor, roundTo: pricing.roundTo },
    rules,
    brands: brands.map((b) => ({ slug: b.slug, name: b.name })),
    categories: CATEGORIES.map((c) => ({ slug: c.slug, name: c.name })),
    products: rows,
    pending: rows.filter((r) => r.price !== r.live).length,
    canPublish: !!process.env.DEPLOY_HOOK_URL,
  };
}

/** Sets or clears one rule. markup null and fixed null removes it. */
export async function setRule(input: { scope: unknown; key: unknown; markup: unknown; fixed: unknown }, by: string) {
  const scope = SCOPES.find((s) => s === input.scope) as Scope | undefined;
  if (!scope) throw new HttpError(400, "Unknown rule.");
  const key = scope === "default" || scope === "floor" ? "" : String(input.key ?? "").slice(0, 80);
  if (scope !== "default" && scope !== "floor") {
    const known = scope === "brand" ? brands.some((b) => b.slug === key) : scope === "category" ? CATEGORIES.some((c) => c.slug === key) : costs.products.some((p) => p.id === key);
    if (!known) throw new HttpError(400, "Pick something from the list.");
  }
  const markup = input.markup == null || input.markup === "" ? null : Number(input.markup);
  const fixed = input.fixed == null || input.fixed === "" ? null : Math.trunc(Number(input.fixed));
  if (markup != null && !(markup >= 0 && markup <= 2)) throw new HttpError(400, "Markup must be between 0% and 200%.");
  if (fixed != null && !(fixed >= 1000 && fixed <= 100_000_000)) throw new HttpError(400, "Enter a price in naira.");
  if ((scope === "default" || scope === "floor") && markup == null) throw new HttpError(400, "Enter a percentage.");
  if (scope === "floor" && markup! > 0.5) throw new HttpError(400, "The margin floor is a minimum, keep it under 50%.");
  const sql = await db();
  if (markup == null && fixed == null) await sql`delete from price_rules where scope = ${scope} and key = ${key}`;
  else await sql`insert into price_rules (scope, key, markup, fixed, updated_by) values (${scope}, ${key}, ${fixed != null ? null : markup}, ${fixed}, ${by})
    on conflict (scope, key) do update set markup = excluded.markup, fixed = excluded.fixed, updated_at = now(), updated_by = excluded.updated_by`;
}

/** Rebuilds the site so the saved rules become the live prices. */
export async function publishPrices() {
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) throw new HttpError(400, "Publishing isn't connected yet. Add a deploy hook in Vercel and set it as DEPLOY_HOOK_URL.");
  const r = await fetch(hook, { method: "POST" });
  if (!r.ok) throw new HttpError(502, "Vercel didn't accept the rebuild. Try again.");
}
