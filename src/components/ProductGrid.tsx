"use client";
import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { CATEGORIES, brands, type Product } from "@/lib/catalog";

type Sort = "featured" | "price-asc" | "price-desc";

export function ProductGrid({ items, initialQuery = "", showCategory = true, showBrand = true, initialCategory = "", initialBrand = "" }: {
  items: Product[]; initialQuery?: string; showCategory?: boolean; showBrand?: boolean; initialCategory?: string; initialBrand?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState(initialCategory);
  const [brand, setBrand] = useState(initialBrand);
  const [sort, setSort] = useState<Sort>("featured");
  const [max, setMax] = useState(0);

  const list = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let r = items.filter((p) => {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.specs.join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t)) && (!cat || p.category === cat) && (!brand || p.brand === brand) && (!max || p.price <= max);
    });
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [items, q, cat, brand, sort, max]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search by name, size or brand" className="field !w-full sm:!w-64" aria-label="Search" />
        {showCategory && (
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="field !w-auto" aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        )}
        {showBrand && (
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="field !w-auto" aria-label="Brand">
            <option value="">All brands</option>
            {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        )}
        <select value={max} onChange={(e) => setMax(+e.target.value)} className="field !w-auto" aria-label="Budget">
          <option value={0}>Any budget</option>
          <option value={250000}>Under ₦250k</option>
          <option value={1000000}>Under ₦1m</option>
          <option value={2500000}>Under ₦2.5m</option>
          <option value={5000000}>Under ₦5m</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field !w-auto sm:ml-auto" aria-label="Sort">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
      <p className="mt-4 text-sm text-mute" aria-live="polite">{list.length} {list.length === 1 ? "product" : "products"}</p>
      {list.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="font-medium">Nothing matches those filters.</p>
          <button className="btn btn-ghost mt-4" onClick={() => { setQ(""); setCat(initialCategory); setBrand(initialBrand); setMax(0); }}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
