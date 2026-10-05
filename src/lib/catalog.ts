import data from "@/data/products.json";

export type Brand = { slug: string; name: string; tagline: string; officialUrl: string };
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  specs: string[];
  description: string;
  image: string;
  sourceUrl: string;
  price: number;
};

export { CATEGORIES } from "./categories";
import { CATEGORIES } from "./categories";

export const brands: Brand[] = data.brands;
/** Selling prices are worked out at build time (scripts/price-catalog.mjs); brand costs never ship to the browser. */
export const products: Product[] = data.products;

const bySlug = new Map(products.map((p) => [p.slug, p]));
const byId = new Map(products.map((p) => [p.id, p]));

export const getProduct = (slug: string) => bySlug.get(slug);
export const getProductById = (id: string) => byId.get(id);
export const getBrand = (slug: string) => brands.find((b) => b.slug === slug);
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const brandName = (slug: string) => getBrand(slug)?.name ?? slug;

/** Best-effort capacity extraction from names/specs, used by the power planner. */
export function capacity(p: Product) {
  const text = `${p.name} ${p.specs.join(" ")}`;
  const kwh = [...text.matchAll(/(\d+(?:\.\d+)?)\s*kWh/gi)].map((m) => +m[1]);
  const wh = [...text.matchAll(/(\d{3,5})\s*Wh\b/gi)].map((m) => +m[1] / 1000);
  const kw = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:kW|kVA)\b/gi)].map((m) => +m[1]);
  const w = [...text.matchAll(/(\d{3,4})\s*W\b/gi)].map((m) => +m[1] / 1000);
  const storage = Math.max(0, ...kwh, ...wh);
  const power = Math.max(0, ...kw, ...(p.category === "solar-panels" ? [] : w));
  return { kwh: storage || null, kw: power || null };
}

export function related(p: Product, n = 4) {
  return products
    .filter((x) => x.slug !== p.slug && (x.category === p.category || x.brand === p.brand))
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, n);
}
