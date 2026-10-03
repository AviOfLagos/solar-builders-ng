import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { PackageCard } from "@/components/PackageCard";
import { SEGMENTS, tiersFor } from "@/data/packages";

export const metadata: Metadata = {
  title: "Solar packages for every Lagos home, shop and office",
  description: "Ready-made solar kits for students, remote workers, renters, shops, family flats, duplexes and offices in Lagos — with typical installed cost shown upfront.",
  alternates: { canonical: "/packages" },
};

export default function Packages() {
  return (
    <>
      <PageHead title="Solar packages" intro="Pick your situation. Every kit is matched from our brands and priced with typical Lagos installation shown upfront." crumbs={[["Home", "/"], ["Packages", "/packages"]]} />
      <nav className="mx-auto max-w-7xl px-4" aria-label="Jump to">
        <ul className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => <li key={s.slug}><a href={`#${s.slug}`} className="block rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm hover:border-ink">{s.short}</a></li>)}
        </ul>
      </nav>
      {SEGMENTS.map((s) => (
        <section key={s.slug} id={s.slug} className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-14">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">{s.name}</h2>
              <p className="mt-1 max-w-2xl text-ink-2">{s.who}</p>
            </div>
            <Link href={`/packages/${s.slug}`} className="text-sm font-semibold underline underline-offset-4">More about {s.short.toLowerCase()}</Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{tiersFor(s).map((t) => <PackageCard key={t.id} t={t} />)}</div>
        </section>
      ))}
    </>
  );
}
