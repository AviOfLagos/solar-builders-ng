import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuild } from "@/lib/server/social";
import { ItemsList } from "@/components/ItemsList";
import { AddAllToCart } from "@/components/AddAllToCart";
import { Share } from "@/components/Share";
import { RefCapture } from "@/components/RefCapture";
import { naira } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/b/[id]">): Promise<Metadata> {
  const b = await getBuild((await props.params).id);
  if (!b) return { title: "Build not found" };
  const by = b.store ? b.store.name : "Solar Builders NG";
  return { title: `${b.title || "Solar setup"} by ${by} — ${naira(b.total)}`, description: b.note || `A solar setup put together by ${by}. ${b.items.length} items, ${naira(b.total)}, delivered in Lagos.`, robots: { index: false } };
}

export default async function BuildPage(props: PageProps<"/b/[id]">) {
  const b = await getBuild((await props.params).id, true);
  if (!b) notFound();
  const by = b.store ? b.store.name : b.author ? b.author : "a friend";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {b.store && <RefCapture slug={b.store.slug} />}
      <p className="text-sm text-mute">Solar setup from {b.store ? <Link href={`/s/${b.store.slug}`} className="font-semibold text-ink underline">{b.store.name}{b.store.kind === "installer" ? " (installer)" : ""}</Link> : by}</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">{b.title || "Your solar setup"}</h1>
      {b.note && <p className="mt-3 whitespace-pre-line text-lg text-ink-2">{b.note}</p>}
      <div className="mt-8"><ItemsList items={b.items} /></div>
      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-paper p-4"><span>Total, free delivery in Lagos</span><span className="font-display num text-3xl font-bold">{naira(b.total)}</span></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <AddAllToCart items={b.items} refSlug={b.store?.slug} label="Buy this setup" goTo="/checkout" className="btn btn-sun" />
        <AddAllToCart items={b.items} refSlug={b.store?.slug} label="Fund with friends" goTo="/fund/new" className="btn btn-ghost" />
        <AddAllToCart items={b.items} refSlug={b.store?.slug} label="Pay small small" goTo="/pay-small-small" className="btn btn-ghost" />
      </div>
      <div className="mt-10"><p className="mb-2 text-sm font-semibold">Send this setup to someone</p><Share path={`/b/${b.id}`} text={`Solar setup: ${b.title || "my build"} (${naira(b.total)})`} /></div>
    </div>
  );
}
