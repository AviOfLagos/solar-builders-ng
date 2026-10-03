"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useCart } from "@/lib/cart";
import { getProductById, brandName } from "@/lib/catalog";
import { naira } from "@/lib/format";

export function useCartLines() {
  const lines = useCart((s) => s.lines);
  const items = lines.map((l) => ({ ...l, p: getProductById(l.id) })).filter((l) => l.p) as { id: string; qty: number; p: NonNullable<ReturnType<typeof getProductById>> }[];
  const subtotal = items.reduce((s, l) => s + l.p.price * l.qty, 0);
  return { items, subtotal };
}

function ShareCart() {
  const lines = useCart((s) => s.lines);
  const [state, setState] = useState("");
  return (
    <button className="underline underline-offset-4" onClick={async () => {
      setState("…");
      try {
        const r = await api<{ path: string }>("/builds", { body: { items: lines } });
        const url = new URL(r.path, location.origin).toString();
        await navigator.clipboard.writeText(url).catch(() => {});
        setState("Link copied");
        window.open(`https://wa.me/?text=${encodeURIComponent("Here's my solar setup: " + url)}`, "_blank");
      } catch (e) { setState((e as Error).message); }
    }}>{state || "Share cart"}</button>
  );
}

export function CartDrawer() {
  const { open, setOpen, setQty, remove } = useCart();
  const { items, subtotal } = useCartLines();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-semibold">Your cart</h2>
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-haze" aria-label="Close cart">✕</button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-mute">Your cart is empty. Start with a battery, an inverter or a full system.</p>
            <Link href="/shop" onClick={() => setOpen(false)} className="btn btn-ink">Browse products</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((l) => (
                <li key={l.id} className="flex gap-3 py-4">
                  <div className="relative h-20 w-20 shrink-0 rounded-lg border border-line bg-white">
                    <Image src={l.p.image} alt="" fill sizes="80px" className="object-contain p-1.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-mute">{brandName(l.p.brand)}</p>
                    <Link href={`/product/${l.p.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-medium hover:underline">{l.p.name}</Link>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-line">
                        <button className="h-8 w-8" onClick={() => (l.qty > 1 ? setQty(l.id, l.qty - 1) : remove(l.id))} aria-label="Decrease">−</button>
                        <span className="num w-6 text-center text-sm">{l.qty}</span>
                        <button className="h-8 w-8" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <span className="num font-semibold">{naira(l.p.price * l.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-line p-5">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="num font-semibold">{naira(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-mute"><span>Delivery in Lagos</span><span>Free</span></div>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-sun w-full text-base">Checkout · {naira(subtotal)}</Link>
              <div className="flex justify-center gap-4 text-sm">
                <ShareCart />
                <Link href="/fund/new" onClick={() => setOpen(false)} className="underline underline-offset-4">Fund with friends</Link>
                <Link href="/pay-small-small" onClick={() => setOpen(false)} className="underline underline-offset-4">Pay small small</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
