import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ProductGrid";
import { PageHead } from "@/components/PageHead";
import { CATEGORIES, getCategory, products } from "@/lib/catalog";
import { naira } from "@/lib/format";
import { JsonLd, breadcrumbs, abs } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }));

export async function generateMetadata(props: PageProps<"/category/[slug]">): Promise<Metadata> {
  const c = getCategory((await props.params).slug)!;
  const items = products.filter((p) => p.category === c.slug);
  const min = Math.min(...items.map((p) => p.price));
  return {
    title: `${c.name} price in Lagos (from ${naira(min)})`,
    description: `${c.blurb} ${items.length} options from top brands, from ${naira(min)}. Free delivery in Lagos.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function Category(props: PageProps<"/category/[slug]">) {
  const c = getCategory((await props.params).slug);
  if (!c) notFound();
  const items = products.filter((p) => p.category === c.slug);
  const crumbs: [string, string][] = [["Home", "/"], ["Shop", "/shop"], [c.name, `/category/${c.slug}`]];
  return (
    <>
      <PageHead title={c.name} intro={c.blurb} crumbs={crumbs} />
      <div className="mx-auto max-w-7xl px-4"><ProductGrid items={items} showCategory={false} /></div>
      <JsonLd data={breadcrumbs(crumbs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: c.name, itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/product/${p.slug}`), name: p.name })) }} />
    </>
  );
}
