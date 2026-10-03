import Link from "next/link";
import { PowerPlanner } from "@/components/PowerPlanner";
import { ProductCard } from "@/components/ProductCard";
import { FuelVsSolar } from "@/components/FuelVsSolar";
import { brands, products } from "@/lib/catalog";
import { inPromo } from "@/lib/promo";
import { naira } from "@/lib/format";
import { FAQ, GUIDES, WORRIES } from "@/data/content";
import { SEGMENTS, tiersFor } from "@/data/packages";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { PROMO } from "@/config/store";

export default function Home() {
  const promoItems = products.filter(inPromo).filter((p) => p.price >= 100_000 && p.price < 2_500_000);
  const deals = [...new Set(promoItems.map((p) => p.category))]
    .map((c) => promoItems.filter((p) => p.category === c).sort((a, b) => a.price - b.price)[0])
    .slice(0, 4);

  return (
    <>
      <section className="bg-ink pb-10 text-white">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display max-w-2xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">How much solar do you need?</h1>
            <p className="max-w-sm text-white/70">Tell us what you want to keep on when light goes. We'll match a kit and show the full price, installation included.</p>
          </div>
          <div className="mt-8"><PowerPlanner /></div>
          <a href="#packages" className="mx-auto mt-8 flex w-fit items-center gap-2 text-sm text-white/70 hover:text-white">
            Or pick a package for your situation, or browse all {products.length} products
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </a>
        </div>
      </section>

      <section id="packages" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Solar for how you live</h2>
          <Link href="/packages" className="text-sm font-semibold underline underline-offset-4">Compare all packages</Link>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => {
            const tiers = tiersFor(s);
            const from = Math.min(...tiers.map((t) => t.price));
            return (
              <li key={s.slug}>
                <Link href={`/packages/${s.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-5 hover:border-ink">
                  <span className="font-display text-xl font-bold leading-tight">{s.name}</span>
                  <span className="mt-2 text-sm italic text-ink-2">{s.worry}</span>
                  <span className="mt-auto flex items-baseline justify-between pt-5">
                    <span className="text-sm text-mute">{tiers.length} kits from</span>
                    <span className="font-display num text-lg font-bold">{naira(from)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/shop" className="flex h-full flex-col justify-between rounded-2xl bg-sun p-5">
              <span className="font-display text-xl font-bold leading-tight">Know exactly what you want?</span>
              <span className="mt-4 text-sm font-semibold">Browse all {products.length} products from {brands.length} brands</span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">The things people worry about</h2>
        <p className="mt-2 max-w-2xl text-ink-2">Most bad solar stories come from fake batteries, wrong sizing and rushed installs. Here's how we handle each one.</p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WORRIES.map((w) => (
            <li key={w.q} className="flex flex-col rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-lg font-semibold">{w.q}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{w.a}</p>
              <Link href={w.href} className="mt-3 text-sm font-semibold underline underline-offset-4">Learn more</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20"><FuelVsSolar /></section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{PROMO.name}</h2>
            <p className="mt-1 text-ink-2">{PROMO.percent}% off selected batteries, inverters, panels and power stations every Friday.</p>
          </div>
          <Link href="/deals" className="text-sm font-semibold underline underline-offset-4">All deals</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="grid gap-10 rounded-2xl bg-paper p-6 sm:p-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">What happens after you pay</h2>
            <p className="mt-2 text-ink-2">A real person takes it from there.</p>
            <p className="mt-6 text-sm text-mute">Genuine stock from {brands.map((b) => b.name).join(", ")}.</p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {[
              ["We call to confirm", "Your order is pending until we call you to confirm items and a delivery time."],
              ["We order from the brand", "Every item comes from the brand's official Nigerian store, with manufacturer warranty."],
              ["Free delivery in Lagos", "To any of the 20 LGAs, from Ikorodu to Lekki to Badagry."],
              ["Installation, if you asked", "An engineer from our team installs it with proper breakers, surge protection and earthing."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-lg font-bold">{i + 1}</span>
                <span><span className="block font-semibold">{t}</span><span className="mt-1 block text-sm text-ink-2">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-20 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Guides</h2>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
            {GUIDES.slice(0, 5).map((g) => (
              <li key={g.slug}><Link href={`/guides/${g.slug}`} className="block p-5 hover:bg-haze"><span className="font-semibold">{g.title}</span></Link></li>
            ))}
          </ul>
          <Link href="/guides" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">All guides</Link>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Questions</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}<span className="text-xl transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={faqJsonLd(FAQ)} />
    </>
  );
}
