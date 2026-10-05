"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./ui/Icon";
import { useCart } from "@/lib/cart";
import { useCartLines } from "./CartDrawer";
import { OpenLinkDialog } from "./OpenLink";
import { MegaMenu, MobileMenu } from "./MegaMenu";
import { MENU } from "@/lib/nav";

export type Card = { id: string; provider?: "paystack" | "stripe"; brand: string; last4: string; nickname: string; expMonth: number; expYear: number; bank?: string };

/** Flows that should feel like an app screen: no full header, no floating bar. */
const FOCUSED = ["/find", "/start", "/checkout", "/kit", "/fund/new", "/admin"];

export function Header() {
  const { count } = useCartLines();
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the cart count comes from localStorage
  useEffect(() => setMounted(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close overlays when the page changes
  useEffect(() => { setMenu(false); setSearch(false); }, [path]);

  const focused = FOCUSED.some((p) => path === p || path.startsWith(p + "/")) && !path.startsWith("/checkout/success");
  const badge = mounted && count > 0 ? count : 0;
  const goSearch = (q: string) => router.push(`/shop?q=${encodeURIComponent(q)}`);

  if (focused) return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-haze/85 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-2 px-4">
          <Link href="/" aria-label="Solar Builders NG home" className="shrink-0 lg:w-[220px]"><Logo /></Link>
          <MegaMenu items={MENU} path={path} />
          <div className="ml-auto flex items-center justify-end gap-1 lg:ml-0 lg:w-[220px] xl:w-auto">
            {search ? (
              <form role="search" className="flex items-center" onSubmit={(e) => { e.preventDefault(); goSearch(String(new FormData(e.currentTarget).get("q") || "")); }}>
                <input name="q" type="search" autoFocus placeholder="Search 5kVA, lithium, EcoFlow…" className="field !w-56 !py-2 text-sm sm:!w-72" aria-label="Search products" onBlur={(e) => !e.currentTarget.value && setSearch(false)} />
              </form>
            ) : (
              <IconBtn label="Search" onClick={() => setSearch(true)}><Icon name="search" /></IconBtn>
            )}
            <IconBtn label="Open a link or code" onClick={() => setLinkOpen(true)} className="hidden sm:grid"><Icon name="link" /></IconBtn>
            <Link href="/account" aria-label="My account" className="hidden h-11 w-11 place-items-center rounded-xl hover:bg-paper sm:grid"><Icon name="user" /></Link>
            <IconBtn label={`Cart, ${badge} items`} onClick={() => setOpen(true)}>
              <Icon name="cart" />
              {badge > 0 && <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-mint">{badge}</span>}
            </IconBtn>
            <Link href="/find" className="btn btn-ink ml-2 hidden !py-2.5 text-sm xl:inline-flex">Find my kit</Link>
          </div>
        </div>
      </header>

      {/* Phones: the app's floating bar. */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center gap-1 rounded-3xl bg-paper p-1.5 shadow-[0_8px_30px_rgba(23,32,27,0.14)]">
          <BarLink href="/" icon="home" label="Home" on={path === "/"} />
          <BarLink href="/shop" icon="grid" label="Shop" on={path.startsWith("/shop") || path.startsWith("/product") || path.startsWith("/category") || path.startsWith("/brands")} />
          <BarLink href="/find" icon="sun" label="Find kit" on={false} accent />
          <BarLink href="/account" icon="user" label="Account" on={path.startsWith("/account")} />
          <button onClick={() => setMenu(true)} aria-label="More" className="grid h-12 w-12 place-items-center rounded-2xl text-ink-2"><Icon name="menu" /></button>
        </div>
      </nav>

      {menu && <MobileMenu items={MENU} onClose={() => setMenu(false)} onLink={() => { setMenu(false); setLinkOpen(true); }} />}
      <OpenLinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  );
}

function IconBtn({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return <button onClick={onClick} aria-label={label} className={`relative grid h-11 w-11 place-items-center rounded-xl hover:bg-paper ${className}`}>{children}</button>;
}

function BarLink({ href, icon, label, on, accent }: { href: string; icon: string; label: string; on: boolean; accent?: boolean }) {
  return (
    <Link href={href} aria-label={label} aria-current={on ? "page" : undefined}
      className={`flex h-12 items-center gap-2 whitespace-nowrap rounded-2xl px-3.5 text-sm font-bold ${on ? "bg-ink text-white" : accent ? "bg-mint text-ink" : "text-ink-2"}`}>
      <Icon name={icon} size={21} className={on ? "text-mint" : ""} />
      {(on || accent) && <span>{label}</span>}
    </Link>
  );
}

export function CardChip({ c }: { c: Card }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-night p-3 text-white">
      <div className="grid h-8 w-11 place-items-center rounded-xl bg-mint text-[10px] font-bold uppercase text-ink">{c.brand.slice(0, 4)}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{c.nickname}</p>
        <p className="num truncate text-xs text-white/70">•••• {c.last4} · {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}{c.provider === "stripe" ? " · international" : c.bank ? ` · ${c.bank}` : ""}</p>
      </div>
    </div>
  );
}
