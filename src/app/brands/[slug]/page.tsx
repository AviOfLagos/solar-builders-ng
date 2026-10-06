import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ProductGrid";
import { PageHead } from "@/components/PageHead";
import { brands, getBrand, products } from "@/lib/catalog";
import { JsonLd, breadcrumbs } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => brands.map((b) => ({ slug: b.slug }));

export async function generateMetadata(props: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const b = getBrand((await props.params).slug)!;
  return withOg({
    title: `${b.name} products and prices in Lagos`,
    description: `Buy genuine ${b.name} solar products in Lagos. ${b.tagline} Free Lagos delivery and optional installation.`,
    alternates: { canonical: `/brands/${b.slug}` },
  }, `brand/${b.slug}`);
}

export default async function BrandPage(props: PageProps<"/brands/[slug]">) {
  const b = getBrand((await props.params).slug);
  if (!b) notFound();
  const items = products.filter((p) => p.brand === b.slug);
  const crumbs: [string, string][] = [["Home", "/"], ["Brands", "/brands"], [b.name, `/brands/${b.slug}`]];
  return (
    <>
      <PageHead title={`${b.name} in Lagos`} intro={b.tagline} crumbs={crumbs} />
      <div className="mx-auto max-w-7xl px-4"><ProductGrid items={items} showBrand={false} /></div>
      <JsonLd data={breadcrumbs(crumbs)} />
    </>
  );
}
