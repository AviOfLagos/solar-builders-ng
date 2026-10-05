import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { FuelVsSolar } from "@/components/FuelVsSolar";
import { Hero, RoleCards } from "@/components/home/Hero";
import { Icon } from "@/components/ui/Icon";
import { brands, products } from "@/lib/catalog";
import { inPromo } from "@/lib/promo";
import { naira } from "@/lib/format";
import { FAQ, GUIDES, WORRIES } from "@/data/content";
import { SEGMENTS, tiersFor } from "@/data/packages";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { PROMO } from "@/config/store";

const WAYS: [string, string, string, string][] = [
  ["card", "Pay now", "Card, transfer or USSD in naira, or a card from abroad.", "/find"],
  ["calendar", "Pay small small", "30–50% down, the rest over 3 to 12 months.", "/pay-small-small"],
  ["split", "Split with your squad", "2–10 people, equal shares, a pay button each.", "/go-solar-me"],
  ["megaphone", "Let people chip in", "A Go Solar Me page. It orders itself at 100%.", "/go-solar-me"],
  ["gift", "Buy for someone", "Pay from anywhere. We deliver to them in Lagos.", "/give"],
  ["ticket", "Give a gift card", "They choose the kit. It never expires.", "/gift-cards"],
];

function SectionHead({ kicker, title, sub, action }: { kicker?: string; title: string; sub?: string; action?: [string, string] }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker && <p className="text-sm font-bold text-sun-deep">{kicker}</p>}
        <h2 className="font-display mt-1 text-4xl leading-tight sm:text-5xl">{title}</h2>
        {sub && <p className="mt-3 text-ink-2">{sub}</p>}
      </div>
      {action && <Link href={action[1]} className="flex items-center gap-1.5 text-sm font-bold">{action[0]}<Icon name="arrow" size={16} /></Link>}
    </div>
  );
}

export default function Home() {
  const promoItems = products.filter(inPromo).filter((p) => p.price >= 100_000 && p.price < 2_500_000);
  const deals = [...new Set(promoItems.map((p) => p.category))]
    .map((c) => promoItems.filter((p) => p.category === c).sort((a, b) => a.price - b.price)[0])
    .slice(0, 4);

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <SectionHead kicker="Start here" title="What brings you here?" sub="Pick one and we'll take you down the right path. Everything else stays one tap away." />
        <RoleCards />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <div className="grid gap-4 rounded-[2rem] bg-paper p-6 sm:p-10 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <div>
            <h2 className="font-display text-4xl leading-tight">From question to <span className="hl">lights on</span></h2>
            <p className="mt-3 text-ink-2">No jargon, no guesswork. A real person checks every order.</p>
            <Link href="/find" className="btn btn-ink mt-6">Find my kit<Icon name="arrow" size={18} /></Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ["clock", "3 quick questions", "What should it run, and how long is light off? We match a kit and show what you'll save on fuel."],
              ["card", "Pay your way", "All at once, bit by bit, split with friends, or a page anyone can chip in to."],
              ["truck", "We deliver and install", "We call to confirm, deliver free in Lagos, and install it properly if you asked."],
            ].map(([i, t, d], k) => (
              <li key={t} className="rounded-3xl bg-haze p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-paper"><Icon name={i} /></span>
                  <span className="num text-3xl font-light text-mute">0{k + 1}</span>
                </div>
                <p className="mt-6 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <SectionHead kicker="Pay your way" title="However your money moves" sub="Pick the kit first. You choose how to pay on the next screen." />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WAYS.map(([i, t, d, href]) => (
            <li key={t}>
              <Link href={href} className="card group flex h-full items-start gap-4 p-5 hover:shadow-[0_10px_30px_rgba(23,32,27,0.08)]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-tint"><Icon name={i} /></span>
                <span className="flex-1"><span className="block font-semibold">{t}</span><span className="mt-0.5 block text-sm text-ink-2">{d}</span></span>
                <Icon name="chevron" size={18} className="mt-1 text-mute transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="packages" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24">
        <SectionHead kicker="Packages" title="Solar for how you live" action={["Compare all packages", "/packages"]} />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => {
            const tiers = tiersFor(s);
            const from = Math.min(...tiers.map((t) => t.price));
            return (
              <li key={s.slug}>
                <Link href={`/packages/${s.slug}`} className="card group flex h-full flex-col p-5 hover:shadow-[0_10px_30px_rgba(23,32,27,0.08)]">
                  <span className="text-lg font-semibold leading-tight">{s.name}</span>
                  <span className="mt-2 text-sm text-ink-2">{s.worry}</span>
                  <span className="mt-auto flex items-baseline justify-between pt-5">
                    <span className="text-sm text-mute">{tiers.length} kits from</span>
                    <span className="num text-lg font-bold">{naira(from)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/shop" className="flex h-full flex-col justify-between rounded-3xl bg-night p-5 text-white">
              <span className="text-lg font-semibold leading-tight">Know exactly what you want?</span>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-bold text-mint">Browse all {products.length} products<Icon name="arrow" size={16} /></span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <SectionHead kicker="Brands" title="Genuine stock only" sub="Bought from each brand's official Nigerian store, with the manufacturer's warranty." action={["All brands", "/brands"]} />
        <ul className="mt-8 flex flex-wrap gap-3">
          {brands.map((b) => (
            <li key={b.slug}><Link href={`/brands/${b.slug}`} className="block rounded-2xl bg-paper px-6 py-4 text-lg font-semibold hover:shadow-[0_10px_30px_rgba(23,32,27,0.08)]">{b.name}</Link></li>
          ))}
        </ul>
      </section>

      {deals.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-24">
          <SectionHead kicker="Every Friday" title={PROMO.name} sub={`${PROMO.percent}% off selected batteries, inverters, panels and power stations.`} action={["All deals", "/deals"]} />
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pt-24"><FuelVsSolar /></section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <SectionHead kicker="Peace of mind" title="The things people worry about" sub="Most bad solar stories come from fake batteries, wrong sizing and rushed installs. Here's how we handle each one." />
        <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WORRIES.map((w) => (
            <li key={w.q} className="card flex flex-col p-6">
              <p className="font-semibold">{w.q}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{w.a}</p>
              <Link href={w.href} className="mt-4 flex items-center gap-1 text-sm font-bold">Learn more<Icon name="chevron" size={16} /></Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-24 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="font-display text-4xl">Guides</h2>
          <ul className="mt-6 overflow-hidden rounded-3xl bg-paper">
            {GUIDES.slice(0, 5).map((g) => (
              <li key={g.slug} className="border-b border-line last:border-0"><Link href={`/guides/${g.slug}`} className="flex items-center justify-between gap-3 p-5 hover:bg-haze/60"><span className="font-semibold">{g.title}</span><Icon name="chevron" size={18} className="shrink-0 text-mute" /></Link></li>
            ))}
          </ul>
          <Link href="/guides" className="mt-4 inline-flex items-center gap-1 text-sm font-bold">All guides<Icon name="chevron" size={16} /></Link>
        </div>
        <div>
          <h2 className="font-display text-4xl">Questions</h2>
          <div className="mt-6 overflow-hidden rounded-3xl bg-paper">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line p-5 last:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-haze text-lg transition-transform group-open:rotate-45" aria-hidden>+</span>
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
