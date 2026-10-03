import { products, brands, CATEGORIES, brandName } from "@/lib/catalog";
import { FAQ, GUIDES } from "@/data/content";
import { SEGMENTS, tiersFor } from "@/data/packages";
import { STORE } from "@/config/store";
import { abs } from "@/lib/seo";
import { naira } from "@/lib/format";

export const dynamic = "force-static";

// A plain-text map of the store for AI assistants and answer engines (llmstxt.org).
export function GET() {
  const lines = [
    `# ${STORE.name}`,
    "",
    `> Online solar store in Lagos, Nigeria selling genuine inverters, lithium batteries, solar panels, power stations and complete solar systems from ${brands.map((b) => b.name).join(", ")}. Free delivery to all 20 Lagos LGAs. Optional installation by our engineers. Prices in naira (NGN).`,
    "",
    "## Packages by buyer type (kit price; typical installed total)",
    ...SEGMENTS.flatMap((s) => [`### [${s.name}](${abs(`/packages/${s.slug}`)})`, ...tiersFor(s).map((t) => `- ${t.name}: ${t.tagline}. ${t.kw}kW / ${t.kwh}kWh. Kit ${naira(t.price)}${t.install[1] ? `; installed ${naira(t.price + t.install[0])}–${naira(t.price + t.install[1])}` : "; no installation needed"}.`)]),
    "",
    "## Categories",
    ...CATEGORIES.map((c) => `- [${c.name}](${abs(`/category/${c.slug}`)}): ${c.blurb}`),
    "",
    "## Brands",
    ...brands.map((b) => `- [${b.name}](${abs(`/brands/${b.slug}`)}): ${b.tagline}`),
    "",
    "## Products and current prices",
    ...products.map((p) => `- [${p.name}](${abs(`/product/${p.slug}`)}) — ${brandName(p.brand)}, ${naira(p.price)}${p.specs.length ? ` (${p.specs.join(", ")})` : ""}`),
    "",
    "## Guides",
    ...GUIDES.map((g) => `- [${g.title}](${abs(`/guides/${g.slug}`)}): ${g.description}`),
    "",
    "## FAQ",
    ...FAQ.flatMap((f) => [`### ${f.q}`, f.a, ""]),
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
