import Link from "next/link";
import Image from "next/image";
import { brandName, type Product } from "@/lib/catalog";
import { PriceTag } from "./PriceTag";
import { AddToCart } from "./AddToCart";

export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-paper">
      <Link href={`/product/${p.slug}`} className="relative block aspect-square bg-white">
        <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw" className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]" priority={priority} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 border-t border-line p-4">
        <p className="text-xs font-semibold text-mute">{brandName(p.brand)}</p>
        <h3 className="line-clamp-2 text-[0.95rem] font-medium leading-snug">
          <Link href={`/product/${p.slug}`} className="hover:underline">{p.name}</Link>
        </h3>
        {p.specs.length > 0 && <p className="line-clamp-1 text-xs text-mute">{p.specs.slice(0, 3).join(" / ")}</p>}
        <div className="mt-auto pt-2"><PriceTag price={p.price} slug={p.slug} category={p.category} /></div>
        <AddToCart id={p.id} />
      </div>
    </article>
  );
}
