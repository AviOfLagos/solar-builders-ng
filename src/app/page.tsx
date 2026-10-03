import Link from "next/link";
import Image from "next/image";
import { PowerPlanner } from "@/components/PowerPlanner";
import { ProductCard } from "@/components/ProductCard";
import { brands, products, CATEGORIES } from "@/lib/catalog";
import { inPromo } from "@/lib/promo";
import { FAQ, GUIDES } from "@/data/content";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { PROMO } from "@/config/store";

export default function Home() {
  // Two mid-priced picks from each promo category.
  const promoItems = products.filter(inPromo).filter((p) => p.price >= 100_000 && p.price < 2_500_000);
  const deals = [...new Set(promoItems.map((p) => p.category))]
    .flatMap((c) => promoItems.filter((p) => p.category === c).sort((a, b) => a.price - b.price).slice(0, 2))
    .slice(0, 8);
  const popular = ["itel-powercore-3k-pro", "felicity-ivem6048", "ecoflow-delta-3-max", "arnergy-5kw-inverter", "sun-king-powerhub-pro", "felicity-flh-48100ug1", "itel-energy-complete-4kw", "ecoflow-river-3-plus"]
    .map((s) => products.find((p) => p.slug.startsWith(s)))
    .filter((p) => !!p);
  const catImage = (slug: string) => products.filter((p) => p.category === slug).sort((a, b) => a.price - b.price)[Math.floor(products.filter((p) => p.category === slug).length / 2)]?.image;

  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_1.05fr] lg:py-20">
          <div>
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl">
              When light goes off in Lagos, yours stays on.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">
              Inverters, lithium batteries, panels and power stations from five brands we trust. Delivered free across Lagos, with an installer if you want one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/category/complete-systems" className="btn btn-sun">Shop complete systems</Link>
              <Link href="/shop" className="btn border border-white/30 text-white hover:bg-white/10">Browse all {products.length} products</Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              <li>Genuine stock from official brand stores</li>
              <li>Free delivery in all 20 LGAs</li>
              <li>Pay by card, save it for next time</li>
            </ul>
          </div>
          <PowerPlanner />
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 divide-line px-4 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link href={`/brands/${b.slug}`} className="block px-4 py-6 hover:bg-haze">
                <p className="font-display text-lg font-semibold">{b.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-mute">{b.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Shop by what you need</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`} className="group grid h-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-line bg-paper p-4 hover:border-ink sm:p-5">
                <span>
                  <span className="font-display block text-lg font-semibold leading-tight">{c.name}</span>
                  <span className="mt-1 hidden text-sm text-mute sm:block">{c.blurb}</span>
                </span>
                {catImage(c.slug) && <span className="relative h-16 w-16 sm:h-24 sm:w-24"><Image src={catImage(c.slug)!} alt="" fill sizes="96px" className="object-contain transition-transform group-hover:scale-105" /></span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">{PROMO.name} picks</h2>
            <p className="mt-1 text-mute">{PROMO.percent}% off these every Friday, Lagos time.</p>
          </div>
          <Link href="/deals" className="text-sm font-semibold underline underline-offset-4">See all deals</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {deals.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Popular in Lagos homes</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {popular.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="grid gap-10 rounded-2xl bg-paper p-6 sm:p-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">How ordering works</h2>
            <p className="mt-2 text-mute">Pay online, and a real person takes it from there.</p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {[
              ["Pay for your products", "Checkout with your card. Tick “I need an installer” if you want one — installation is quoted separately."],
              ["We confirm by phone", "Your order is pending until we call you to confirm items and a delivery time."],
              ["Delivery in Lagos", "We source from the brand's official store and deliver to your address, free."],
              ["Installation, if you asked", "An engineer from our team sets it up and shows you how to use it."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-lg font-bold">{i + 1}</span>
                <span><span className="block font-semibold">{t}</span><span className="mt-1 block text-sm text-mute">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Solar guides for Lagos</h2>
          <ul className="mt-6 space-y-3">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="block rounded-xl border border-line bg-paper p-5 hover:border-ink">
                  <span className="font-display block text-lg font-semibold leading-snug">{g.title}</span>
                  <span className="mt-1 block text-sm text-mute">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Questions people ask</h2>
          <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-paper">
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
