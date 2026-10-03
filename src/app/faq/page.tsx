import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { FAQ } from "@/data/content";
import { JsonLd, faqJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Frequently asked questions — solar delivery & installation in Lagos",
  description: "Delivery areas, installation, payments, warranty and Solar Friday deals at Solar Builders NG.",
  alternates: { canonical: "/faq" },
};

export default function Faq() {
  return (
    <>
      <PageHead title="Questions & answers" crumbs={[["Home", "/"], ["FAQ", "/faq"]]} />
      <dl className="mx-auto max-w-3xl space-y-8 px-4">
        {FAQ.map((f) => (
          <div key={f.q}><dt className="font-display text-xl font-semibold">{f.q}</dt><dd className="mt-2 text-lg leading-relaxed text-ink-2">{f.a}</dd></div>
        ))}
      </dl>
      <JsonLd data={faqJsonLd(FAQ)} />
    </>
  );
}
