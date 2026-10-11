import type { Metadata } from "next";
import { ALL_TIERS } from "@/data/packages";
import { Survey } from "./Survey";

export const metadata: Metadata = {
  title: "For solar installers: help us get quotes right",
  description: "Five minutes for Lagos solar installers: tell us what a quote must contain and what you'd want in our app.",
  alternates: { canonical: "/engineers" },
  robots: { index: false, follow: true },
};

/** A real kit from our calculator, so installers react to something concrete. */
function sampleQuote() {
  const t = ALL_TIERS.find((x) => x.segment.slug === "families" && x.best) ?? ALL_TIERS.find((x) => x.segment.slug === "families")!;
  return { name: t.name, kw: t.kw, kwh: t.kwh, price: t.price, install: t.install, powers: t.powers, items: t.lines.map((l) => ({ name: l.p.name, qty: l.qty, price: l.p.price })) };
}

export default function Page() {
  return <Survey sample={sampleQuote()} />;
}
