"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useCartLines } from "@/components/CartDrawer";
import { brandName } from "@/lib/catalog";
import { naira } from "@/lib/format";

export default function CartPage() {
  const { setQty, remove } = useCart();
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="mx-auto max-w-5xl px-4 py-16 text-mute">Loading your cart…</div>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Your cart</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-paper p-10 text-center">
          <p>Your cart is empty.</p>
          <Link href="/shop" className="btn btn-ink mt-4">Browse products</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
            {items.map((l) => (
              <li key={l.id} className="flex gap-4 p-4">
                <div className="relative h-24 w-24 shrink-0 rounded-lg border border-line bg-white"><Image src={l.p.image} alt="" fill sizes="96px" className="object-contain p-2" /></div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-xs text-mute">{brandName(l.p.brand)}</p>
                  <Link href={`/product/${l.p.slug}`} className="font-medium hover:underline">{l.p.name}</Link>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-line">
                        <button className="h-9 w-9" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease">−</button>
                        <span className="num w-6 text-center">{l.qty}</span>
                        <button className="h-9 w-9" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <button onClick={() => remove(l.id)} className="text-sm text-mute underline">Remove</button>
                    </div>
                    <span className="num font-semibold">{naira(l.p.price * l.qty)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit space-y-3 rounded-xl border border-line bg-paper p-5">
            <div className="flex justify-between"><span>Subtotal</span><span className="num font-semibold">{naira(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-mute"><span>Delivery in Lagos</span><span>Free</span></div>
            <Link href="/checkout" className="btn btn-sun w-full">Checkout</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
