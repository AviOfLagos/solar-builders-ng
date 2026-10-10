import "server-only";
import { APPLIANCES, PRESETS, SIZING, sizeLoad, type CustomLoad, type Load } from "@/lib/sizing";
import { recommend, type ResolvedTier } from "@/data/packages";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { abs } from "@/lib/seo";
import { str } from "./api";

/** Anyone's calculator may call these (solarbuildersng.com, the app), so they answer cross-origin. */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

/** The rules, so another site can draw the same appliance list and get the same numbers. */
export const sizingRules = () => ({
  version: SIZING.version,
  factors: { headroom: SIZING.headroom, dod: SIZING.dod, batteryMatch: SIZING.batteryMatch },
  formula: "kw = (running watts + biggest start-up surge) × headroom; kwh = Σ(watts × qty × duty × hours) ÷ dod; a kit fits when kit.kw ≥ kw and kit.kwh ≥ kwh × batteryMatch",
  appliances: APPLIANCES.map((a) => ({ key: a.key, label: a.label, w: a.w, duty: a.duty, surge: "surge" in a ? a.surge : 1 })),
  presets: Object.entries(PRESETS).map(([key, p]) => ({ key, ...p })),
  lgas: LAGOS_LGAS,
});

/** Reads { load, custom, hours, segment } from any caller, safely. */
export function readSizingInput(b: Record<string, unknown>) {
  const raw = (b.load && typeof b.load === "object" ? b.load : {}) as Record<string, unknown>;
  const load: Partial<Load> = {};
  for (const a of APPLIANCES) { const n = Math.trunc(Number(raw[a.key] ?? 0)); if (n > 0) load[a.key] = Math.min(n, 100); }
  const custom: CustomLoad[] = (Array.isArray(b.custom) ? b.custom : []).slice(0, 30).flatMap((c) => {
    const o = (c ?? {}) as Record<string, unknown>;
    const w = Number(o.w), qty = Math.trunc(Number(o.qty ?? 1));
    if (!(w > 0 && w <= 20_000 && qty > 0 && qty <= 100)) return [];
    const duty = Number(o.duty ?? 1), surge = Number(o.surge ?? 1);
    return [{ name: str(o.name, 60), w, qty, duty: duty > 0 && duty <= 1 ? duty : 1, surge: surge >= 1 && surge <= 6 ? surge : 1 }];
  });
  const h = Number(b.hours);
  const hours = h > 0 && h <= 24 ? h : 8;
  const segment = str(b.segment, 40) || undefined;
  return { load, custom, hours, segment };
}

const tierOut = (t: ResolvedTier) => ({
  id: t.id, name: t.name, tagline: t.tagline, kw: t.kw, kwh: t.kwh, price: t.price, install: t.install, powers: t.powers,
  items: t.lines.map((l) => ({ id: l.p.id, name: l.p.name, brand: l.p.brand, qty: l.qty, price: l.p.price, image: abs(l.p.image), url: abs(`/product/${l.p.slug}`) })),
  kitUrl: abs(`/kit?items=${encodeURIComponent(t.lines.map((l) => `${l.p.id}:${l.qty}`).join(","))}&name=${encodeURIComponent(t.name)}`),
});

/** The one answer every calculator gives: what they need, and the kits that cover it. */
export function sizeAndRecommend(i: ReturnType<typeof readSizingInput>) {
  const size = sizeLoad(i.load, i.hours, i.custom);
  const picks = size.running > 0 ? recommend(size.kw, size.kwh, 3, i.segment) : [];
  return { rulesVersion: SIZING.version, size, hours: i.hours, picks: picks.map(tierOut), custom: !picks.length && size.running > 0, whatsapp: STORE.whatsapp };
}
