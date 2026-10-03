"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";

export function AddToCart({ id, full = false }: { id: string; full?: boolean }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  if (!full)
    return (
      <button onClick={() => add(id)} className="btn btn-ink w-full !py-2.5 text-sm" aria-label="Add to cart">
        Add to cart
      </button>
    );
  return (
    <div className="flex gap-3">
      <div className="flex items-center rounded-full border border-line bg-white">
        <button className="h-12 w-11 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
        <span className="num w-8 text-center font-semibold" aria-live="polite">{qty}</span>
        <button className="h-12 w-11 text-xl" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">+</button>
      </div>
      <button onClick={() => add(id, qty)} className="btn btn-sun flex-1 text-base">Add to cart</button>
    </div>
  );
}
