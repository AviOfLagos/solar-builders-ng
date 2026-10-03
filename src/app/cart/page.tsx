"use client";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useCartLines } from "@/components/CartDrawer";
import { brandName } from "@/lib/catalog";
import { naira } from "@/lib/format";
import { api, setLeadId } from "@/lib/client";
import { CART } from "@/config/store";

function Cart() {
  const { setQty, remove, replace } = useCart();
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState("");
  const resume = useSearchParams().get("resume");
  const router = useRouter();
  const once = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cart lives in localStorage, so render only after mount
    setMounted(true);
    if (!resume || once.current) return;
    once.current = true;
    // A resume link from our WhatsApp follow-up: bring back the cart they left.
    api<{ items: { id: string; qty: number }[] }>(`/leads/${encodeURIComponent(resume)}`)
      .then((r) => { if (r.items.length) { replace(r.items); setLeadId(resume); setNote("Welcome back. Here's the cart you saved."); } })
      .catch((e) => setNote((e as Error).message))
      .finally(() => router.replace("/cart"));
  }, [resume, replace, router]);

  if (!mounted) return <div className="mx-auto max-w-5xl px-4 py-16 text-mute">Loading your cart…</div>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Your cart</h1>
      {note && <p role="status" className="mt-3 rounded-lg bg-haze p-3 text-sm">{note}</p>}
      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-paper p-10 text-center">
          <p>Your cart is empty.</p>
          <div className="mt-4 flex justify-center gap-3"><Link href="/" className="btn btn-sun">Use the calculator</Link><Link href="/shop" className="btn btn-ink">Browse products</Link></div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
            {items.map((l) => (
              <li key={l.id} className="flex gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 rounded-lg border border-line bg-white sm:h-24 sm:w-24"><Image src={l.p.image} alt="" fill sizes="96px" className="object-contain p-2" /></div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-xs text-mute">{brandName(l.p.brand)}</p>
                  <Link href={`/product/${l.p.slug}`} className="font-medium hover:underline">{l.p.name}</Link>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-line">
                        <button className="h-9 w-9" onClick={() => (l.qty > 1 ? setQty(l.id, l.qty - 1) : remove(l.id))} aria-label={l.qty > 1 ? "Decrease" : "Remove"}>−</button>
                        <span className="num w-6 text-center">{l.qty}</span>
                        <button className="h-9 w-9 disabled:opacity-30" disabled={l.qty >= CART.maxQty} onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase">+</button>
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
            <Link href="/fund/new" className="btn btn-ghost w-full">Go Solar Me with friends</Link>
            <p className="text-center text-sm"><Link href="/fund/new?kind=squad" className="underline">Split with housemates</Link> · <Link href="/pay-small-small" className="underline">Pay small small</Link></p>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return <Suspense><Cart /></Suspense>;
}
