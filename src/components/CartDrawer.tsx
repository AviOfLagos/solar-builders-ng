"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api, getLeadId, saveLead } from "@/lib/client";
import { useCart } from "@/lib/cart";
import { getProductById, brandName } from "@/lib/catalog";
import { naira, NG_PHONE, normalizePhone } from "@/lib/format";
import { CART, STORE } from "@/config/store";

/** Cart lines joined to the catalog. Products that no longer exist are left out everywhere. */
export function useCartLines() {
  const lines = useCart((s) => s.lines);
  const items = lines.map((l) => ({ ...l, p: getProductById(l.id) })).filter((l) => l.p) as { id: string; qty: number; p: NonNullable<ReturnType<typeof getProductById>> }[];
  const subtotal = items.reduce((s, l) => s + l.p.price * l.qty, 0);
  return { items, subtotal, count: items.reduce((s, l) => s + l.qty, 0) };
}

function ShareCart() {
  const { items } = useCartLines();
  const [state, setState] = useState("");
  return (
    <button className="underline underline-offset-4" disabled={state === "…"} onClick={async () => {
      setState("…");
      try {
        const r = await api<{ path: string }>("/builds", { body: { items: items.map((l) => ({ id: l.id, qty: l.qty })) } });
        const url = new URL(r.path, STORE.url).toString();
        await navigator.clipboard.writeText(url).catch(() => {});
        setState("Link copied");
        window.open(`https://wa.me/?text=${encodeURIComponent("Here's my solar setup: " + url)}`, "_blank", "noopener");
      } catch (e) { setState((e as Error).message); }
    }}>{state || "Share cart"}</button>
  );
}

/** One field: a WhatsApp number, so a quote reaches them and we can follow up if they don't finish. */
function QuoteCapture() {
  const { items } = useCartLines();
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(() => (getLeadId() ? "done" : "idle"));
  const [err, setErr] = useState("");
  if (state === "done") return <p className="rounded-lg bg-leaf/10 p-3 text-xs">We&apos;ve saved your cart. Questions? <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener">WhatsApp us</a>.</p>;
  return (
    <form noValidate className="rounded-lg bg-haze p-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!NG_PHONE.test(normalizePhone(phone))) { setErr("Enter a Nigerian WhatsApp number, e.g. 0803 123 4567."); return; }
      setState("busy"); setErr("");
      try { await saveLead({ phone, consent: true, source: "cart", items: items.map((l) => ({ id: l.id, qty: l.qty })) }); setState("done"); }
      catch (x) { setErr((x as Error).message); setState("error"); }
    }}>
      <label className="text-xs font-semibold" htmlFor="quote-phone">Get this quote on WhatsApp</label>
      <div className="mt-1.5 flex gap-2">
        <input id="quote-phone" className="field !py-2 text-sm" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(""); }} />
        <button className="btn btn-ink shrink-0 !px-3 !py-2 text-sm" disabled={state === "busy"}>{state === "busy" ? "…" : "Send"}</button>
      </div>
      {err ? <p role="alert" className="mt-1 text-xs text-flare">{err}</p> : <p className="mt-1 text-[11px] text-mute">We&apos;ll only message you about this cart.</p>}
    </form>
  );
}

/** Keeps a saved lead's cart up to date as the shopper changes it. */
export function LeadSync() {
  const { items } = useCartLines();
  const key = items.map((l) => `${l.id}:${l.qty}`).join(",");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!getLeadId() || !key) return;
    const t = setTimeout(() => {
      saveLead({ source: "cart", items: key.split(",").map((x) => { const [id, qty] = x.split(":"); return { id, qty: Number(qty) }; }) }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [key]);
  return null;
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
            <p className="text-mute">Your cart is empty. Not sure what you need? The calculator picks a kit in a few taps.</p>
            <div className="flex gap-2"><Link href="/" onClick={() => setOpen(false)} className="btn btn-sun">Calculator</Link><Link href="/shop" onClick={() => setOpen(false)} className="btn btn-ink">Browse</Link></div>
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
                        <button className="h-8 w-8" onClick={() => (l.qty > 1 ? setQty(l.id, l.qty - 1) : remove(l.id))} aria-label={l.qty > 1 ? "Decrease" : "Remove"}>−</button>
                        <span className="num w-6 text-center text-sm">{l.qty}</span>
                        <button className="h-8 w-8 disabled:opacity-30" disabled={l.qty >= CART.maxQty} onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <span className="num font-semibold">{naira(l.p.price * l.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-line p-5">
              <QuoteCapture />
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="num font-semibold">{naira(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-mute"><span>Delivery in Lagos</span><span>Free</span></div>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-sun w-full text-base">Checkout · {naira(subtotal)}</Link>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
                <Link href="/fund/new" onClick={() => setOpen(false)} className="underline underline-offset-4">Go Solar Me</Link>
                <Link href="/fund/new?kind=squad" onClick={() => setOpen(false)} className="underline underline-offset-4">Split with squad</Link>
                <Link href="/pay-small-small" onClick={() => setOpen(false)} className="underline underline-offset-4">Pay small small</Link>
                <ShareCart />
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
