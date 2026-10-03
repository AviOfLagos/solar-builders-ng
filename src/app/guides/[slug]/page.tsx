import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { GUIDES } from "@/data/content";
import { JsonLd, breadcrumbs, abs } from "@/lib/seo";
import { STORE } from "@/config/store";
import { ALL_TIERS } from "@/data/packages";
import { naira } from "@/lib/format";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const g = GUIDES.find((x) => x.slug === slug)!;
  return { title: g.title, description: g.description, alternates: { canonical: `/guides/${g.slug}` }, openGraph: { type: "article", title: g.title } };
}

export default async function Guide(props: PageProps<"/guides/[slug]">) {
  const { slug } = await props.params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  const crumbs: [string, string][] = [["Home", "/"], ["Guides", "/guides"], [g.title, `/guides/${g.slug}`]];
  return (
    <>
      <PageHead title={g.title} intro={g.description} crumbs={crumbs} />
      <article className="mx-auto max-w-3xl px-4">
        {g.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="font-display text-2xl font-semibold">{s.h}</h2>
            {s.p.map((t) => <p key={t} className="mt-3 text-lg leading-relaxed text-ink-2">{t}</p>)}
          </section>
        ))}
        {g.slug === "solar-installation-cost-lagos" && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">Our kits and what they cost installed</h2>
            <p className="mt-2 text-sm text-mute">Live prices. Installation covers labour, cables, breakers, surge protection, mounting and earthing.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-haze text-left"><tr><th className="p-3">Who it’s for</th><th className="p-3">Kit</th><th className="p-3">Size</th><th className="p-3 text-right">Kit price</th><th className="p-3 text-right">Typical installed total</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {ALL_TIERS.map((t) => (
                    <tr key={t.id}>
                      <td className="p-3">{t.segment.short}</td>
                      <td className="p-3"><Link className="underline" href={`/packages/${t.segment.slug}#${t.id}`}>{t.name}</Link></td>
                      <td className="num p-3">{t.kw}kW / {t.kwh}kWh</td>
                      <td className="num p-3 text-right">{naira(t.price)}</td>
                      <td className="num p-3 text-right">{t.install[1] ? `${naira(t.price + t.install[0])}–${naira(t.price + t.install[1])}` : "No install needed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {g.sources && (
          <section className="mt-10 text-sm">
            <h2 className="font-semibold">Sources</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">{g.sources.map((x) => <li key={x.href}><a className="underline" href={x.href} rel="nofollow noopener" target="_blank">{x.label}</a></li>)}</ul>
          </section>
        )}
        <div className="mt-10 flex flex-wrap gap-3 rounded-2xl bg-paper p-6">
          {g.links.map((l) => <Link key={l.href} href={l.href} className="btn btn-ghost">{l.label}</Link>)}
        </div>
      </article>
      <JsonLd data={breadcrumbs(crumbs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, ...(g.keyword ? { keywords: g.keyword } : {}), mainEntityOfPage: abs(`/guides/${g.slug}`), author: { "@type": "Organization", name: STORE.name }, publisher: { "@id": abs("/#store") } }} />
    </>
  );
}
