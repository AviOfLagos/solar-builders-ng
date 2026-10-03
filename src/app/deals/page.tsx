import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { PageHead } from "@/components/PageHead";
import { products } from "@/lib/catalog";
import { inPromo } from "@/lib/promo";
import { PROMO } from "@/config/store";

export const metadata: Metadata = {
  title: `${PROMO.name} solar deals in Lagos — ${PROMO.percent}% off`,
  description: `Every Friday: ${PROMO.percent}% off selected lithium batteries, inverters, solar panels and power stations. Free delivery in Lagos.`,
  alternates: { canonical: "/deals" },
};

export default function Deals() {
  return (
    <>
      <PageHead title={`${PROMO.name} deals`} intro={`${PROMO.percent}% off these products every Friday, from midnight to midnight Lagos time.`} crumbs={[["Home", "/"], ["Deals", "/deals"]]} />
      <div className="mx-auto max-w-7xl px-4"><ProductGrid items={products.filter(inPromo)} /></div>
    </>
  );
}
