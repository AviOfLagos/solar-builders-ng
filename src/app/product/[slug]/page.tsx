import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products, getProduct, getCategory, getBrand, related } from "@/lib/catalog";
import { PriceTag } from "@/components/PriceTag";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { naira } from "@/lib/format";
import { JsonLd, productJsonLd, breadcrumbs } from "@/lib/seo";
import { STORE } from "@/config/store";

export const dynamicParams = false;
export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const p = getProduct((await props.params).slug)!;
  const b = getBrand(p.brand)!;
  return {
    title: `${p.name} — price in Lagos`,
    description: `${p.name} for ${naira(p.price)} in Lagos. ${p.description} Genuine ${b.name}, free delivery across Lagos, optional installation.`.slice(0, 300),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { images: [{ url: p.image }], title: p.name },
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const p = getProduct((await props.params).slug);
  if (!p) notFound();
  const c = getCategory(p.category)!;
  const b = getBrand(p.brand)!;
  const crumbs: [string, string][] = [["Home", "/"], [c.name, `/category/${c.slug}`], [p.name, `/product/${p.slug}`]];
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hi, I'm interested in the ${p.name} (${naira(p.price)}).`)}`;
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-mute">
          <Link href="/" className="hover:underline">Home</Link> / <Link href={`/category/${c.slug}`} className="hover:underline">{c.name}</Link>
        </nav>
        <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
            <Image src={p.image} alt={p.name} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain p-8" />
          </div>
          <div className="lg:pt-4">
            <Link href={`/brands/${b.slug}`} className="text-sm font-semibold text-mute hover:underline">{b.name}</Link>
            <h1 className="font-display mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
            <div className="mt-5"><PriceTag price={p.price} slug={p.slug} category={p.category} size="lg" /></div>
            {p.description && <p className="mt-5 text-lg leading-relaxed text-ink-2">{p.description}</p>}
            {p.specs.length > 0 && (
              <dl className="mt-6 flex flex-wrap gap-2">
                {p.specs.map((s) => <dd key={s} className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm">{s}</dd>)}
              </dl>
            )}
            <div className="mt-8"><AddToCart id={p.id} full /></div>
            <ul className="mt-6 space-y-2 rounded-xl bg-paper p-5 text-sm">
              <li className="flex gap-2"><span className="text-leaf">●</span> Free delivery anywhere in Lagos</li>
              <li className="flex gap-2"><span className="text-leaf">●</span> Genuine {b.name}, sourced from the official store, with manufacturer warranty</li>
              <li className="flex gap-2"><span className="text-leaf">●</span> Need it installed? Tick “I need an installer” at checkout</li>
            </ul>
            <a href={wa} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Questions? Ask us on WhatsApp</a>
          </div>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="font-display text-2xl font-semibold">You may also need</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{related(p).map((r) => <ProductCard key={r.id} p={r} />)}</div>
      </section>
      <JsonLd data={productJsonLd(p)} />
      <JsonLd data={breadcrumbs(crumbs)} />
    </>
  );
}
