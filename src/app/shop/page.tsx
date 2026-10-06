import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import { ProductGrid } from "@/components/ProductGrid";
import { PageHead } from "@/components/PageHead";
import { products } from "@/lib/catalog";
import { JsonLd, breadcrumbs } from "@/lib/seo";

export const metadata: Metadata = withOg({
  title: "Shop solar inverters, batteries, panels & power stations in Lagos",
  description: "Compare prices on genuine solar products from Felicity, itel, Sun King, Arnergy and EcoFlow. Free delivery across Lagos.",
  alternates: { canonical: "/shop" },
}, "page/shop");

export default async function Shop(props: PageProps<"/shop">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const brand = typeof sp.brand === "string" ? sp.brand : "";
  return (
    <>
      <PageHead title="Shop all solar products" intro="Every product from our five brands, priced in naira and delivered across Lagos." crumbs={[["Home", "/"], ["Shop", "/shop"]]} />
      <div className="mx-auto max-w-7xl px-4">
        <ProductGrid key={`${q}-${category}-${brand}`} items={products} initialQuery={q} initialCategory={category} initialBrand={brand} />
      </div>
      <JsonLd data={breadcrumbs([["Home", "/"], ["Shop", "/shop"]])} />
    </>
  );
}
