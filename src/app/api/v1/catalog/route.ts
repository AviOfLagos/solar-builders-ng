import { products, brands, CATEGORIES } from "@/lib/catalog";
import { SEGMENTS, ALL_TIERS } from "@/data/packages";
import { PROMO, STORE, LAGOS_LGAS } from "@/config/store";
import { abs } from "@/lib/seo";
import { sizingRules } from "@/lib/server/quote";

export const dynamic = "force-static";
export const revalidate = 3600;

/** Everything the mobile app needs to render the store, in one cacheable call. */
export function GET() {
  return Response.json({
    store: { name: STORE.name, whatsapp: STORE.whatsapp, phone: STORE.supportPhone, deliveryFee: STORE.deliveryFee, currency: "NGN", lgas: LAGOS_LGAS },
    promo: PROMO,
    sizing: sizingRules(),
    categories: CATEGORIES,
    brands,
    products: products.map((p) => ({ ...p, image: abs(p.image) })),
    segments: SEGMENTS.map((s) => ({ ...s, tiers: ALL_TIERS.filter((t) => t.segment.slug === s.slug).map((t) => ({ id: t.id, name: t.name, tagline: t.tagline, powers: t.powers, kw: t.kw, kwh: t.kwh, install: t.install, best: !!t.best, price: t.price, items: t.items.map((i) => ({ id: t.lines.find((l) => l.p.slug === i.slug)!.p.id, qty: i.qty })) })) })),
  });
}
