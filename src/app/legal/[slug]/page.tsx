import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL, getLegal } from "@/data/legal";

export const dynamicParams = false;
export function generateStaticParams() {
  return LEGAL.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const d = getLegal((await props.params).slug);
  return d ? withOg({ title: d.title, description: d.summary, alternates: { canonical: `/legal/${d.slug}` } }, "page/home") : {};
}

export default async function Legal(props: PageProps<"/legal/[slug]">) {
  const d = getLegal((await props.params).slug);
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-mute">Updated {new Date(d.updated).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">{d.title}</h1>
      <p className="mt-3 text-lg text-ink-2">{d.summary}</p>
      {d.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="font-display text-xl font-semibold">{s.h}</h2>
          {s.p.map((p) => <p key={p} className="mt-2 leading-relaxed text-ink-2">{p}</p>)}
        </section>
      ))}
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-line pt-6 text-sm">
        {LEGAL.filter((x) => x.slug !== d.slug).map((x) => <Link key={x.slug} className="underline" href={`/legal/${x.slug}`}>{x.title}</Link>)}
      </nav>
    </article>
  );
}
