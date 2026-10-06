import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorePage } from "@/lib/server/social";
import { RefCapture } from "@/components/RefCapture";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/catalog";
import { naira } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/s/[slug]">): Promise<Metadata> {
  const s = await getStorePage((await props.params).slug);
  if (!s) return { title: "Store not found" };
  return withOg({ title: `${s.name} — solar ${s.kind === "installer" ? "installer" : "store"} in Lagos`, description: s.bio || `Buy genuine solar products from ${s.name}, delivered free across Lagos.` }, `store/${(await props.params).slug}`);
}

export default async function StorePage(props: PageProps<"/s/[slug]">) {
  const s = await getStorePage((await props.params).slug);
  if (!s) notFound();
  const featured = [...products].sort((a, b) => a.price - b.price).filter((_, i) => i % 5 === 2).slice(0, 8);
  return (
    <>
      <RefCapture slug={s.slug} />
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm text-sun">{s.kind === "installer" ? "Solar installer" : "Solar store"} · powered by Solar Builders NG</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{s.name}</h1>
          {s.bio && <p className="mt-3 max-w-2xl text-lg text-white/75">{s.bio}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/packages" className="btn btn-sun">See packages</Link>
            <Link href="/shop" className="btn border border-white/30 text-white hover:bg-white/10">Browse all products</Link>
            {s.whatsapp && <a href={`https://wa.me/${s.whatsapp.replace(/^0/, "234").replace(/^\+/, "")}`} className="btn border border-white/30 text-white hover:bg-white/10">WhatsApp {s.owner || s.name}</a>}
          </div>
          <p className="mt-6 text-xs text-white/50">Every order is fulfilled by Solar Builders NG: genuine stock, free Lagos delivery, secure payments.</p>
        </div>
      </section>
      {s.builds.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-12">
          <h2 className="font-display text-2xl font-bold">Setups by {s.name}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {s.builds.map((b) => (
              <li key={b.id}><Link href={`/b/${b.id}`} className="block rounded-xl border border-line bg-paper p-5 hover:border-ink">
                <span className="font-display block text-lg font-semibold">{b.title || "Solar setup"}</span>
                <span className="mt-1 block text-sm text-mute">{b.items.length} items</span>
                <span className="font-display num mt-3 block text-xl font-bold">{naira(b.total)}</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
      <section className="mx-auto max-w-5xl px-4 pt-12">
        <h2 className="font-display text-2xl font-bold">Popular products</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>
    </>
  );
}
