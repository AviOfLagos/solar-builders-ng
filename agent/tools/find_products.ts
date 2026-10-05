import { defineTool } from "eve/tools";
import { z } from "zod";
import { products, brands } from "../lib/catalog";
import { naira } from "../lib/db";

export default defineTool({
  description: "Search the product catalogue by words in the name, brand or category. Returns our selling price.",
  inputSchema: z.object({ query: z.string().min(1).max(80), limit: z.number().int().min(1).max(20).default(8) }),
  async execute({ query, limit }) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = products.filter((p) => {
      const hay = `${p.name} ${brands.find((b) => b.slug === p.brand)?.name ?? p.brand} ${p.category}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    return hits.slice(0, limit).map((p) => ({ name: p.name, brand: p.brand, category: p.category, price: naira(p.price), link: `/product/${p.slug}` }));
  },
});
