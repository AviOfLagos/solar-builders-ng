"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { Logo } from "./Logo";
import { OpenLinkForm } from "./OpenLink";
import { WHATSAPP, type NavItem, type NavLink } from "@/lib/nav";

const isOn = (path: string, item: NavItem) =>
  item.href ? path.startsWith(item.href) : !!item.groups?.some((g) => g.links.some((l) => l.href !== "/" && path.startsWith(l.href.split("?")[0])));

/** Desktop menu: a pill of a few words; each opens a panel with a feature card and grouped links. */
export function MegaMenu({ items, path }: { items: NavItem[]; path: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hold = () => clearTimeout(timer.current);
  const later = () => { hold(); timer.current = setTimeout(() => setOpen(null), 160); };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the panel when the page changes
  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  const current = items.find((i) => i.label === open);

  return (
    <nav aria-label="Main" className="relative hidden flex-1 justify-center lg:flex" onMouseLeave={later} onMouseEnter={hold}>
      <ul className="flex items-center gap-0.5 rounded-2xl bg-paper/80 p-1 shadow-[0_1px_0_rgba(23,32,27,0.04)]">
        {items.map((i) => {
          const on = isOn(path, i);
          const cls = `flex items-center gap-1 whitespace-nowrap rounded-xl px-3.5 py-2 text-[0.93rem] font-semibold transition-colors ${open === i.label ? "bg-haze text-ink" : on ? "text-ink" : "text-ink-2 hover:text-ink"}`;
          return (
            <li key={i.label}>
              {i.href ? (
                <Link href={i.href} className={cls} onMouseEnter={() => setOpen(null)}>{i.label}</Link>
              ) : (
                <button type="button" className={cls} aria-expanded={open === i.label} aria-haspopup="true"
                  onMouseEnter={() => { hold(); setOpen(i.label); }} onClick={() => setOpen(open === i.label ? null : i.label)}>
                  {i.label}<Icon name="down" size={15} className={`transition-transform ${open === i.label ? "rotate-180" : ""}`} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {current?.groups && (
        <div className="absolute left-1/2 top-full z-50 w-[960px] max-w-[calc(100vw-2rem)] -translate-x-1/2 pt-3" onMouseEnter={hold}>
          <div key={current.label} className="pop grid grid-cols-[300px_1fr_1fr] gap-8 rounded-[1.75rem] bg-paper p-4 pr-8 shadow-[0_24px_60px_rgba(23,32,27,0.16)]">
            <Feature kind={current.feature} close={() => setOpen(null)} />
            {current.groups.map((g) => (
              <div key={g.title} className="py-3">
                <p className="mb-3 text-sm font-semibold text-mute">{g.title}</p>
                <ul className="space-y-1">{g.links.map((l) => <PanelLink key={l.href + l.label} l={l} />)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function PanelLink({ l }: { l: NavLink }) {
  if (!l.icon) return <li><Link href={l.href} className="block rounded-xl px-2 py-1.5 font-semibold text-ink-2 hover:bg-haze hover:text-ink">{l.label}</Link></li>;
  return (
    <li>
      <Link href={l.href} className="group flex items-center gap-3 rounded-2xl p-2 hover:bg-haze">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-haze transition-colors group-hover:bg-mint"><Icon name={l.icon} size={19} /></span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-semibold">{l.label}{l.tag && <span className="rounded-md bg-lemon px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{l.tag}</span>}</span>
          {l.sub && <span className="block text-sm text-mute">{l.sub}</span>}
        </span>
      </Link>
    </li>
  );
}

function Feature({ kind, close }: { kind?: NavItem["feature"]; close: () => void }) {
  if (kind === "link")
    return (
      <div className="flex flex-col rounded-3xl bg-mint-tint p-5">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint"><Icon name="link" /></span>
        <p className="mt-4 text-lg font-semibold leading-snug">Got a link? Drop it here.</p>
        <p className="mt-1 text-sm text-ink-2">From your installer, a friend&apos;s Go Solar Me page or a saved cart. We&apos;ll show you the kit.</p>
        <div className="mt-auto pt-4"><OpenLinkForm label="Link or code" onDone={close} compact /></div>
      </div>
    );
  if (kind === "help")
    return (
      <div className="flex flex-col rounded-3xl bg-night p-5 text-white">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-ink"><Icon name="whatsapp" /></span>
        <p className="mt-4 text-lg font-semibold leading-snug">Talk to a real person</p>
        <p className="mt-1 text-sm text-white/65">Tell us what you want to power. We reply on WhatsApp with a kit and a full price.</p>
        <a href={WHATSAPP} target="_blank" rel="noopener" className="btn btn-sun mt-auto">Chat on WhatsApp</a>
      </div>
    );
  return (
    <Link href="/find" onClick={close} className="group relative flex min-h-[290px] flex-col justify-end overflow-hidden rounded-3xl p-5 text-white">
      <Image src="/photos/hero-portrait.jpg" alt="" fill sizes="290px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-transparent" />
      <span className="relative">
        <span className="tag">3 questions</span>
        <span className="mt-3 block text-lg font-semibold leading-snug">Not sure what you need?</span>
        <span className="mt-1 block text-sm text-white/75">Tell us what should keep running. We match the kit and show what it saves.</span>
        <span className="mt-3 flex items-center gap-1.5 text-sm font-bold text-mint">Find my kit<Icon name="arrow" size={16} /></span>
      </span>
    </Link>
  );
}

/** Phones: the same menu as a sheet, grouped. */
export function MobileMenu({ items, onClose, onLink }: { items: NavItem[]; onClose: () => void; onLink: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={onClose} />
      <div className="rise absolute inset-x-3 bottom-3 max-h-[85vh] overflow-y-auto rounded-3xl bg-paper p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-haze" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <button onClick={onLink} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-mint-tint p-4 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint"><Icon name="link" size={19} /></span>
          <span><span className="block font-semibold">Got a link? Drop it here</span><span className="text-sm text-ink-2">From an installer or a friend</span></span>
        </button>
        {items.map((i) => i.href ? (
          <Link key={i.label} href={i.href} className="mt-3 flex items-center justify-between rounded-2xl bg-haze px-4 py-3.5 font-semibold">{i.label}<Icon name="chevron" size={18} /></Link>
        ) : (
          <details key={i.label} className="group mt-3 rounded-2xl bg-haze" open={i.label === "Shop"}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold">{i.label}<Icon name="down" size={18} className="transition-transform group-open:rotate-180" /></summary>
            <ul className="grid grid-cols-2 gap-1 px-2 pb-3">
              {i.groups!.flatMap((g) => g.links).map((l) => (
                <li key={l.href + l.label}><Link href={l.href} className="block rounded-xl px-2 py-2 text-sm font-semibold text-ink-2 hover:bg-paper">{l.label}</Link></li>
              ))}
            </ul>
          </details>
        ))}
        <Link href="/find" className="btn btn-ink mt-4 w-full">Find my kit in 3 questions</Link>
      </div>
    </div>
  );
}
