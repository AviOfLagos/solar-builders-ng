import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { PackageCard } from "@/components/PackageCard";
import { SEGMENTS, getSegment, tiersFor } from "@/data/packages";
import { WORRIES } from "@/data/content";
import { JsonLd, breadcrumbs, abs } from "@/lib/seo";
import { STORE } from "@/config/store";

export const dynamicParams = false;
export const generateStaticParams = () => SEGMENTS.map((s) => ({ slug: s.slug }));

export async function generateMetadata(props: PageProps<"/packages/[slug]">): Promise<Metadata> {
  const s = getSegment((await props.params).slug)!;
  return { title: s.seoTitle, description: s.seoDescription, alternates: { canonical: `/packages/${s.slug}` } };
}

export default async function SegmentPage(props: PageProps<"/packages/[slug]">) {
  const s = getSegment((await props.params).slug);
  if (!s) notFound();
  const tiers = tiersFor(s);
  const crumbs: [string, string][] = [["Home", "/"], ["Packages", "/packages"], [s.name, `/packages/${s.slug}`]];
  return (
    <>
      <PageHead title={`Solar for ${s.name.toLowerCase()}`} intro={s.who} crumbs={crumbs} />
      <div className="mx-auto max-w-7xl px-4">
        <blockquote className="max-w-2xl border-l-4 border-sun pl-4 text-lg italic text-ink-2">{s.worry}</blockquote>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{tiers.map((t) => <PackageCard key={t.id} t={t} />)}</div>
        <p className="mt-6 text-sm text-mute">
          Kits are matched from each brand's specifications. We confirm everything on a call before ordering from the brand. Installation is quoted separately and never charged at checkout.
          Need something different? <a className="font-semibold text-ink underline" href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hi, I'm looking at solar for ${s.name.toLowerCase()}.`)}`}>Ask us on WhatsApp</a>.
        </p>
      </div>
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="font-display text-2xl font-bold">Common worries</h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {WORRIES.slice(0, 3).map((w) => <li key={w.q} className="rounded-xl border border-line bg-paper p-5"><p className="font-semibold">{w.q}</p><p className="mt-2 text-sm text-ink-2">{w.a}</p><Link className="mt-2 inline-block text-sm underline" href={w.href}>Read more</Link></li>)}
        </ul>
        <p className="mt-8 text-sm">Other packages: {SEGMENTS.filter((x) => x.slug !== s.slug).map((x, i) => <span key={x.slug}>{i > 0 && " · "}<Link className="underline" href={`/packages/${x.slug}`}>{x.short}</Link></span>)}</p>
      </section>
      <JsonLd data={breadcrumbs(crumbs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: s.seoTitle, itemListElement: tiers.map((t, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Product", name: `${t.name} solar kit`, description: t.tagline, image: abs(t.lines[0].p.image), offers: { "@type": "Offer", priceCurrency: "NGN", price: t.price, availability: "https://schema.org/InStock", url: abs(`/packages/${s.slug}#${t.id}`) } } })) }} />
    </>
  );
}
