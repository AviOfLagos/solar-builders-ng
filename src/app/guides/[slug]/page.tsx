import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { GUIDES } from "@/data/content";
import { JsonLd, breadcrumbs, abs } from "@/lib/seo";
import { STORE } from "@/config/store";

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
        <div className="mt-10 flex flex-wrap gap-3 rounded-2xl bg-paper p-6">
          {g.links.map((l) => <Link key={l.href} href={l.href} className="btn btn-ghost">{l.label}</Link>)}
        </div>
      </article>
      <JsonLd data={breadcrumbs(crumbs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, mainEntityOfPage: abs(`/guides/${g.slug}`), author: { "@type": "Organization", name: STORE.name }, publisher: { "@id": abs("/#store") } }} />
    </>
  );
}
