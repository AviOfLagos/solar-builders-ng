"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";

type Card = { id: string; brand: string; last4: string; nickname: string; expMonth: number; expYear: number };
type Me = { user: { email: string } | null; cards: Card[] };

export function Header() {
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const count = lines.reduce((s, l) => s + l.qty, 0);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!cardsOpen) return;
    fetch("/api/me").then((r) => r.json()).then(setMe).catch(() => setMe({ user: null, cards: [] }));
    const close = (e: MouseEvent) => { if (pop.current && !pop.current.contains(e.target as Node)) setCardsOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [cardsOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button className="lg:hidden -ml-1 p-2" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <Link href="/" aria-label="Solar Builders NG home"><Logo /></Link>
        <nav className="ml-8 hidden items-center gap-6 text-[0.95rem] font-medium lg:flex">
          <Link href="/shop" className="hover:text-sun-deep">Shop all</Link>
          <Link href="/packages" className="hover:text-sun-deep">Packages</Link>
          <Link href="/category/complete-systems" className="hover:text-sun-deep">Complete systems</Link>
        </nav>
        <form
          className="ml-auto hidden md:block"
          role="search"
          onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); router.push(`/shop?q=${encodeURIComponent(String(q || ""))}`); }}
        >
          <input name="q" type="search" placeholder="Search 5kVA, lithium, EcoFlow…" className="field !w-64 !rounded-full !py-2 text-sm" aria-label="Search products" />
        </form>
        <div className="relative ml-auto md:ml-0" ref={pop}>
          <button onClick={() => setCardsOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-haze" aria-label="Saved cards" aria-expanded={cardsOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
          </button>
          {cardsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-line bg-paper p-4 shadow-lg">
              {!me ? <p className="text-sm text-mute">Loading…</p> : !me.user ? (
                <div className="space-y-3 text-sm">
                  <p>Sign in with your email to see the cards you've saved.</p>
                  <Link href="/account" onClick={() => setCardsOpen(false)} className="btn btn-ink w-full !py-2">Sign in</Link>
                </div>
              ) : me.cards.length === 0 ? (
                <div className="space-y-3 text-sm">
                  <p>No saved cards yet for {me.user.email}.</p>
                  <Link href="/account/cards" onClick={() => setCardsOpen(false)} className="btn btn-ghost w-full !py-2">Add a card</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-mute">Latest card</p>
                  <CardChip c={me.cards[0]} />
                  {me.cards.length > 1 && <p className="text-xs text-mute">+ {me.cards.length - 1} more saved</p>}
                  <Link href="/account/cards" onClick={() => setCardsOpen(false)} className="btn btn-ghost w-full !py-2 text-sm">Manage cards</Link>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-haze" aria-label={`Cart, ${count} items`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
          {mounted && count > 0 && <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[11px] font-bold">{count}</span>}
        </button>
      </div>
      {menu && (
        <nav className="border-t border-line bg-paper px-4 py-3 lg:hidden" onClick={() => setMenu(false)}>
          <form role="search" className="mb-3" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); router.push(`/shop?q=${encodeURIComponent(String(q || ""))}`); setMenu(false); }} onClick={(e) => e.stopPropagation()}>
            <input name="q" type="search" placeholder="Search products" className="field !rounded-full" aria-label="Search products" />
          </form>
          <ul className="grid grid-cols-2 gap-2 text-sm font-medium">
            <li><Link href="/shop" className="block py-2">Shop all</Link></li>
            <li><Link href="/packages" className="block py-2">Packages</Link></li>
            <li><Link href="/category/complete-systems" className="block py-2">Complete systems</Link></li>
            <li><Link href="/account" className="block py-2">My account</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function CardChip({ c }: { c: Card }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-ink p-3 text-white">
      <div className="grid h-8 w-11 place-items-center rounded bg-sun text-[10px] font-bold uppercase text-ink">{c.brand.slice(0, 4)}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{c.nickname}</p>
        <p className="num text-xs text-white/70">•••• {c.last4} · {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}</p>
      </div>
    </div>
  );
}
