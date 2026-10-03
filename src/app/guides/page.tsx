import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { GUIDES } from "@/data/content";

export const metadata: Metadata = {
  title: "Solar buying guides for Lagos homes",
  description: "Plain-English guides to sizing inverters and batteries, choosing lithium vs tubular, and picking a power station or full solar system in Lagos.",
  alternates: { canonical: "/guides" },
};

export default function Guides() {
  return (
    <>
      <PageHead title="Solar buying guides" intro="Short, practical answers before you spend." crumbs={[["Home", "/"], ["Guides", "/guides"]]} />
      <ul className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.slug}><Link href={`/guides/${g.slug}`} className="block h-full rounded-xl border border-line bg-paper p-6 hover:border-ink">
            <h2 className="font-display text-xl font-semibold leading-snug">{g.title}</h2>
            <p className="mt-2 text-sm text-mute">{g.description}</p>
          </Link></li>
        ))}
      </ul>
    </>
  );
}
