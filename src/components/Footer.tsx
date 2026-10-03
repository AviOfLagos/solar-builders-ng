import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORIES, brands } from "@/lib/catalog";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { Subscribe } from "./Subscribe";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo className="text-white" />
          <p className="max-w-sm text-sm text-white/70">Genuine solar inverters, lithium batteries, panels and power stations from Felicity, itel, Sun King, Arnergy and EcoFlow. Delivered across Lagos.</p>
          <Subscribe />
        </div>
        <div>
          <h3 className="mb-3 font-display font-semibold text-sun">Shop</h3>
          <ul className="space-y-2 text-sm text-white/80">{CATEGORIES.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-3 font-display font-semibold text-sun">Brands</h3>
          <ul className="space-y-2 text-sm text-white/80">{brands.map((b) => <li key={b.slug}><Link href={`/brands/${b.slug}`} className="hover:text-white">{b.name}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-3 font-display font-semibold text-sun">Help</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link href="/guides" className="hover:text-white">Solar buying guides</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/account" className="hover:text-white">My account & cards</Link></li>
            <li><a href={`https://wa.me/${STORE.whatsapp}`} className="hover:text-white">WhatsApp us</a></li>
            <li><a href={`mailto:${STORE.supportEmail}`} className="hover:text-white">{STORE.supportEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-white/50">
          We deliver to all 20 Lagos LGAs: {LAGOS_LGAS.join(", ")}. © {new Date().getFullYear()} {STORE.name}. Brand names belong to their owners.
        </p>
      </div>
    </footer>
  );
}
