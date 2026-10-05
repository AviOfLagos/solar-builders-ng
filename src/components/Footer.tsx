import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORIES, brands } from "@/lib/catalog";
import { SEGMENTS } from "@/data/packages";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { Subscribe } from "./Subscribe";

const ICONS: Record<string, React.ReactNode> = {
  instagram: <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5h.01" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  tiktok: <path d="M14 3v11a4 4 0 1 1-4-4M14 3c.5 2.5 2.5 4.5 5 5" />,
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" />,
  linkedin: <path d="M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 5h4v1.6c.6-1 1.9-1.8 3.5-1.8 3 0 3.5 2 3.5 4.6V20h-4v-5.2c0-1.3 0-2.8-1.8-2.8S15 13.4 15 14.7V20h-4z" />,
};
const URLS: Record<string, (h: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`, x: (h) => `https://x.com/${h}`, tiktok: (h) => `https://tiktok.com/@${h}`,
  facebook: (h) => `https://facebook.com/${h}`, linkedin: (h) => `https://linkedin.com/company/${h}`,
};

export function Footer() {
  const socials = Object.entries(STORE.socials).filter(([, h]) => h);
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent("Hi Solar Builders, I need help choosing a solar setup.")}`;
  return (
    <footer className="mt-24 bg-night pb-24 text-white lg:pb-0">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 border-b border-white/10 py-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-display text-3xl font-bold leading-tight sm:text-4xl">Not sure what to buy?</p>
            <p className="mt-2 text-white/70">Send us what you want to power. A real person replies on WhatsApp with a kit and a full price.</p>
            <a href={wa} className="btn btn-sun mt-5">Chat on WhatsApp</a>
          </div>
          <div className="lg:justify-self-end">
            <p className="font-semibold">Get Solar Friday deals by email</p>
            <p className="mb-3 mt-1 text-sm text-white/60">One email a week. Unsubscribe anytime.</p>
            <Subscribe />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-white/60">Genuine solar from {brands.map((b) => b.name).join(", ")}. Delivered free across Lagos.</p>
            {socials.length > 0 && (
              <ul className="mt-5 flex gap-2">
                {socials.map(([k, h]) => (
                  <li key={k}>
                    <a href={URLS[k](h)} aria-label={k} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-sun hover:text-ink" target="_blank" rel="noopener">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[k]}</svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <FooterCol title="Packages" links={[...SEGMENTS.map((s) => [s.name, `/packages/${s.slug}`] as [string, string])]} />
          <FooterCol title="Shop" links={[["All products", "/shop"], ...CATEGORIES.map((c) => [c.name, `/category/${c.slug}`] as [string, string]), ["Solar Friday deals", "/deals"]]} />
          <FooterCol title="Brands" links={brands.map((b) => [b.name, `/brands/${b.slug}`] as [string, string])} />
          <FooterCol title="Help" links={[["Buy for someone", "/give"], ["Go Solar Me", "/go-solar-me"], ["Gift cards", "/gift-cards"], ["Pay small small", "/pay-small-small"], ["Sell solar & earn", "/sell"], ["Installation cost guide", "/guides/solar-installation-cost-lagos"], ["All guides", "/guides"], ["FAQ", "/faq"], ["My account & cards", "/account"], ["WhatsApp us", wa], ...(STORE.supportEmail ? [[STORE.supportEmail, `mailto:${STORE.supportEmail}`] as [string, string]] : [])]} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-white/45">
          Free delivery to all 20 Lagos LGAs: {LAGOS_LGAS.join(", ")}. © {new Date().getFullYear()} {STORE.name}. Brand names belong to their owners.
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link className="underline hover:text-white" href="/legal/terms">Terms of sale</Link>
            <Link className="underline hover:text-white" href="/legal/refunds">Refunds</Link>
            <Link className="underline hover:text-white" href="/legal/pool-rules">Go Solar Me rules</Link>
            <Link className="underline hover:text-white" href="/legal/privacy">Privacy</Link>
          </span>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-sun">{title}</h3>
      <ul className="space-y-2 text-sm text-white/75">
        {links.map(([l, h]) => (
          <li key={h + l}>{h.startsWith("/") ? <Link href={h} className="hover:text-white">{l}</Link> : <a href={h} className="hover:text-white">{l}</a>}</li>
        ))}
      </ul>
    </div>
  );
}
