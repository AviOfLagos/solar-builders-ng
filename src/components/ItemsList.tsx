import Image from "next/image";
import Link from "next/link";
import { getProductById } from "@/lib/catalog";
import { naira } from "@/lib/format";

export function ItemsList({ items }: { items: { id: string; qty: number }[] }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
      {items.map((i) => {
        const p = getProductById(i.id);
        if (!p) return null;
        return (
          <li key={i.id} className="flex items-center gap-3 p-3">
            <span className="relative h-14 w-14 shrink-0 rounded-xl border border-line bg-white"><Image src={p.image} alt="" fill sizes="56px" className="object-contain p-1" /></span>
            <Link href={`/product/${p.slug}`} className="min-w-0 flex-1 text-sm hover:underline"><span className="line-clamp-2">{p.name}</span><span className="text-mute">Qty {i.qty}</span></Link>
            <span className="num text-sm font-semibold">{naira(p.price * i.qty)}</span>
          </li>
        );
      })}
    </ul>
  );
}
