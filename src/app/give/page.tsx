import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Buy solar for someone in Lagos — family, friends, staff",
  description: "Buy solar for your parents or family in Lagos from anywhere in the world, start a group funding page, send a gift card or pay small small. We deliver and install.",
  alternates: { canonical: "/give" },
};

const WAYS = [
  { title: "Buy it for them", text: "Pay from anywhere, abroad or in Nigeria. Enter their Lagos address and phone. We call them, deliver and install.", href: "/packages", cta: "Pick a package", note: "Choose “Someone else” at checkout" },
  { title: "Fund it together", text: "Start a public page for a kit. Siblings, friends, colleagues or your church chip in any amount. We order when it's fully funded.", href: "/fund/new", cta: "Start a funding page" },
  { title: "Send a gift card", text: "Let them choose. Solar gift cards from ₦10,000 for birthdays, weddings and staff rewards.", href: "/gift-cards", cta: "Buy a gift card" },
  { title: "Pay small small", text: "Pay part today and spread the rest over 3–12 months with our lending partner.", href: "/pay-small-small", cta: "See plans" },
];

export default function Give() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Send light home.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Your parents, your sister, your staff, your old school. Buy solar for anyone in Lagos, alone or together, and we handle delivery and installation on the ground.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pt-12 sm:grid-cols-2">
        {WAYS.map((w) => (
          <div key={w.title} className="flex flex-col rounded-2xl border border-line bg-paper p-6">
            <h2 className="font-display text-2xl font-bold">{w.title}</h2>
            <p className="mt-2 flex-1 text-ink-2">{w.text}</p>
            {w.note && <p className="mt-3 text-xs text-mute">{w.note}</p>}
            <Link href={w.href} className="btn btn-ink mt-5 w-fit">{w.cta}</Link>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-2xl bg-sun p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">Install solar for clients? Sell solar to your people?</h2>
          <p className="mt-2 max-w-2xl">Open your own store on Solar Builders. Put setups together, send your client a link, and earn on every sale. We handle stock, payment and delivery.</p>
          <Link href="/sell" className="btn btn-ink mt-5">Open your store</Link>
        </div>
      </section>
    </>
  );
}
