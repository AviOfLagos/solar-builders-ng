"use client";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { setRef } from "@/lib/client";

export function AddAllToCart({ items, refSlug, label = "Add all to cart", className = "btn btn-sun", goTo }: { items: { id: string; qty: number }[]; refSlug?: string | null; label?: string; className?: string; goTo?: string }) {
  const addMany = useCart((s) => s.addMany);
  const setOpen = useCart((s) => s.setOpen);
  const router = useRouter();
  return (
    <button className={className} onClick={() => {
      if (refSlug) setRef(refSlug);
      addMany(items.map((i) => ({ id: i.id, qty: i.qty })));
      if (goTo) { setOpen(false); router.push(goTo); }
    }}>{label}</button>
  );
}
