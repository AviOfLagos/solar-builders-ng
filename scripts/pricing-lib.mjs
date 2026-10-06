// One place that turns a supplier cost into our selling price. Used by the build script and the admin pricing API.
// Order of precedence: fixed price on a product > product markup > brand markup > category markup > default markup.
// The margin floor (a minimum markup over cost) always wins over a fixed price or any markup below it.
export function priceFor(p, base, rules = {}) {
  const r = { brand: {}, category: {}, productMarkup: {}, productFixed: {}, ...rules };
  const floor = r.floor ?? base.floor ?? 0;
  const markup = r.productMarkup[p.id] ?? r.brand[p.brand] ?? base.brandMarkup?.[p.brand] ?? r.category[p.category] ?? r.default ?? base.markup;
  const round = (n) => Math.ceil(n / base.roundTo) * base.roundTo;
  const min = round(p.costNgn * (1 + floor));
  const wanted = r.productFixed[p.id] != null ? Number(r.productFixed[p.id]) : round(p.costNgn * (1 + markup));
  return { price: Math.max(wanted, min), markup, floored: wanted < min, fixed: r.productFixed[p.id] != null };
}

/** Reads saved rules from the database. Returns {} when there is no database or table yet, so a fresh build still works. */
export async function loadRules(url) {
  if (!url) return {};
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", max: 1, connect_timeout: 8, prepare: false });
  try {
    const rows = await sql`select scope, key, markup, fixed from price_rules`;
    const r = { brand: {}, category: {}, productMarkup: {}, productFixed: {} };
    for (const x of rows) {
      if (x.scope === "default" && x.markup != null) r.default = Number(x.markup);
      else if (x.scope === "floor" && x.markup != null) r.floor = Number(x.markup);
      else if (x.scope === "brand" && x.markup != null) r.brand[x.key] = Number(x.markup);
      else if (x.scope === "category" && x.markup != null) r.category[x.key] = Number(x.markup);
      else if (x.scope === "product") {
        if (x.fixed != null) r.productFixed[x.key] = Number(x.fixed);
        else if (x.markup != null) r.productMarkup[x.key] = Number(x.markup);
      }
    }
    return r;
  } catch (e) {
    console.log(`[catalog] no saved price rules (${String(e.message).slice(0, 60)})`);
    return {};
  } finally {
    await sql.end({ timeout: 2 });
  }
}
