import type { MetadataRoute } from "next";
import { products, brands, CATEGORIES } from "@/lib/catalog";
import { GUIDES } from "@/data/content";
import { SEGMENTS } from "@/data/packages";
import { abs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/packages"), lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    ...SEGMENTS.map((s) => ({ url: abs(`/packages/${s.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    { url: abs("/deals"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: abs(`/category/${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...brands.map((b) => ({ url: abs(`/brands/${b.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: abs(`/product/${p.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7, images: [abs(p.image)] })),
    { url: abs("/guides"), lastModified: now, priority: 0.6 },
    ...GUIDES.map((g) => ({ url: abs(`/guides/${g.slug}`), lastModified: now, priority: 0.6 })),
    { url: abs("/faq"), lastModified: now, priority: 0.5 },
    ...["/go-solar-me", "/give", "/gift-cards", "/pay-small-small", "/sell"].map((p) => ({ url: abs(p), lastModified: now, priority: 0.8 })),
    ...["/legal/terms", "/legal/refunds", "/legal/pool-rules", "/legal/privacy"].map((p) => ({ url: abs(p), lastModified: now, priority: 0.3 })),
  ];
}
