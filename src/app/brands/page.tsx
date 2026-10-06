import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import Link from "next/link";
import Image from "next/image";
import { PageHead } from "@/components/PageHead";
import { brands, products, CATEGORIES } from "@/lib/catalog";
import { naira } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = withOg({
  title: "Solar brands we stock in Lagos",
  description: "Genuine Felicity, itel, Sun King, Arnergy and EcoFlow solar products, bought from each brand's official Nigerian store. Free Lagos delivery.",
  alternates: { canonical: "/brands" },
}, "page/brands");

export default function Brands() {
  return (
    <>
      <PageHead title="Brands we stock" intro="Every item comes from the brand's official Nigerian store, with the manufacturer's warranty." crumbs={[["Home", "/"], ["Brands", "/brands"]]} />
      <ul className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => {
          const items = products.filter((p) => p.brand === b.slug);
          const cats = [...new Set(items.map((p) => p.category))].map((c) => CATEGORIES.find((x) => x.slug === c)?.short ?? c);
          const from = Math.min(...items.map((p) => p.price));
          return (
            <li key={b.slug}>
              <Link href={`/brands/${b.slug}`} className="card group flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-[0_10px_30px_rgba(23,32,27,0.08)]">
                <div className="flex gap-2">
                  {items.slice(0, 3).map((p) => (
                    <div key={p.id} className="relative h-20 w-20 rounded-2xl bg-haze">
                      <Image src={p.image} alt="" fill sizes="80px" className="object-contain p-2" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xl font-semibold">{b.name}</p>
                  <p className="mt-1 text-sm text-ink-2">{b.tagline}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">{cats.slice(0, 4).map((c) => <span key={c} className="rounded-xl bg-haze px-2 py-1 text-xs font-semibold">{c}</span>)}</div>
                <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-mute">{items.length} products · from <span className="num font-semibold text-ink">{naira(from)}</span></span>
                  <Icon name="arrow" size={18} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
