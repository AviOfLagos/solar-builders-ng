"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import { OpenLinkDialog } from "../OpenLink";
import { ROLES, useJourney } from "@/lib/journey";

/** Frosted chip floating on a photo. */
export function PhotoChip({ icon = "sun", label, sub, className = "" }: { icon?: string; label: string; sub?: string; className?: string }) {
  return (
    <div className={`absolute flex items-center gap-2.5 rounded-2xl bg-white/85 py-2 pl-2 pr-4 shadow-sm backdrop-blur ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-mint"><Icon name={icon} size={16} /></span>
      <span className="leading-tight"><span className="block text-sm font-bold">{label}</span>{sub && <span className="block text-xs text-ink-2">{sub}</span>}</span>
    </div>
  );
}

/**
 * The landing hero. First-time visitors get "Get started" (the guided start); people who've told
 * us why they're here get their own next step instead.
 */
export function Hero() {
  const { role, onboarded } = useJourney();
  const [mounted, setMounted] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the role comes from localStorage
  useEffect(() => setMounted(true), []);
  const mine = mounted && role ? ROLES.find((r) => r.key === role) : null;
  const primary = mine ? { href: mine.href, label: mine.cta } : mounted && onboarded ? { href: "/find", label: "Find my kit" } : { href: "/start", label: "Get started" };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-4 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pt-10">
      <div className="relative order-1 h-[380px] overflow-hidden rounded-[2rem] sm:h-[460px] lg:order-2 lg:h-[620px]">
        <Image src="/photos/hero-tall.jpg" alt="A home with solar panels on the roof" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
        <PhotoChip label="Sun power" sub="₦0 on fuel today" className="right-4 top-[38%] rise" />
        <PhotoChip icon="check" label="Installed in Lekki" sub="Lights on since 4pm" className="bottom-5 left-4 rise [animation-delay:.25s]" />
      </div>
      <div className="order-2 lg:order-1">
        <span className="tag">Solar for Lagos homes &amp; businesses</span>
        <h1 className="font-display mt-4 text-[2.7rem] leading-[1.05] sm:text-6xl lg:text-[4.4rem]">
          Steady <span className="hl">light</span>,<br />without the fuel.
        </h1>
        <p className="mt-5 max-w-lg text-lg text-ink-2">Find the right kit in a minute, pay your way, and we deliver and install it anywhere in Lagos.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={primary.href} className="btn btn-ink px-6 text-base">{primary.label}<Icon name="arrow" size={18} /></Link>
          <Link href="/shop" className="btn btn-ghost px-6 text-base">Browse the shop</Link>
          <button onClick={() => setLinkOpen(true)} className="btn btn-ghost !px-4" aria-label="Open a link or code"><Icon name="link" size={20} /></button>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-2">
          {[["truck", "Free Lagos delivery"], ["shield", "Genuine brands, full warranty"], ["card", "Pay at once or bit by bit"]].map(([i, t]) => (
            <li key={t} className="flex items-center gap-2"><Icon name={i} size={18} className="text-sun-deep" />{t}</li>
          ))}
        </ul>
      </div>
      <OpenLinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </section>
  );
}

const PHOTO: Record<string, string> = { home: "/photos/home.jpg", gift: "/photos/gift.jpg", group: "/photos/group.jpg", pro: "/photos/pro.jpg" };

/** "What brings you here?" Picking one remembers it and takes them down that path. */
export function RoleCards() {
  const setRole = useJourney((s) => s.setRole);
  const finish = useJourney((s) => s.finish);
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ROLES.map((r) => (
        <li key={r.key}>
          <Link href={r.href} onClick={() => { setRole(r.key); finish(); }} className="card group flex h-full flex-col p-2 transition-shadow hover:shadow-[0_14px_40px_rgba(23,32,27,0.10)]">
            <div className="relative h-40 overflow-hidden rounded-[1.1rem]">
              <Image src={PHOTO[r.key]} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-white/90"><Icon name={r.icon} size={20} /></span>
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="text-lg font-semibold leading-snug">{r.title}</p>
              <p className="mt-1 text-sm text-ink-2">{r.sub}</p>
              <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-bold">{r.cta}<Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
