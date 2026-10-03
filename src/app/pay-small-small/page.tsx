"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartLines } from "@/components/CartDrawer";
import { Field } from "@/components/Field";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { FINANCE } from "@/config/store";

export default function PaySmallSmall() {
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [down, setDown] = useState(FINANCE.downPayments[0]);
  const [months, setMonths] = useState(6);
  const [f, setF] = useState({ name: "", phone: "", email: "", employment: "", incomeBand: "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setMounted(true); api<{ user: { name: string; email: string; phone: string } | null }>("/me").then((m) => m.user && setF((x) => ({ ...x, name: m.user!.name, email: m.user!.email, phone: m.user!.phone || "" }))).catch(() => {}); }, []);
  const downAmt = Math.round((subtotal * down) / 100);
  const rest = subtotal - downAmt;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Pay small small</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">Get your solar now. Pay a part today and spread the rest over 3 to 12 months with our partner lender. We deliver once you're approved.</p>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["Pick your kit", "Add a package or products to your cart."], ["Choose a plan", "Your down payment and how many months."], ["Get approved", "Our lending partner calls you, usually within 2 working days."]].map(([t, d], i) => (
          <li key={t} className="rounded-xl bg-paper p-5"><span className="font-display grid h-9 w-9 place-items-center rounded-full bg-sun font-bold">{i + 1}</span><p className="mt-3 font-semibold">{t}</p><p className="text-sm text-ink-2">{d}</p></li>
        ))}
      </ol>
      {!mounted ? null : !items.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-paper p-8 text-center"><p>Your cart is empty. Pick a kit first.</p><Link href="/packages" className="btn btn-ink mt-4">See packages</Link></div>
      ) : subtotal < FINANCE.minTotal ? (
        <div className="mt-10 rounded-2xl border border-line bg-paper p-8 text-center"><p>Pay small small starts from {naira(FINANCE.minTotal)}. Your cart is {naira(subtotal)}. <Link className="underline" href="/fund/new">Fund it with friends</Link> instead?</p></div>
      ) : done ? (
        <div className="mt-10 rounded-2xl bg-leaf/10 p-8"><p className="font-display text-2xl font-bold">Request sent.</p><p className="mt-2 text-ink-2">We'll call you on {f.phone} to complete the application with our lending partner. Nothing has been charged.</p></div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="font-semibold">Your plan for {naira(subtotal)}</p>
            <p className="mt-4 text-sm">Down payment</p>
            <div className="mt-2 grid grid-cols-3 gap-2">{FINANCE.downPayments.map((d) => <button key={d} type="button" onClick={() => setDown(d)} className={`rounded-lg border py-2 text-sm ${down === d ? "border-ink bg-sun/20 font-semibold" : "border-line"}`}>{d}%</button>)}</div>
            <p className="mt-4 text-sm">Spread over</p>
            <div className="mt-2 grid grid-cols-3 gap-2">{FINANCE.months.map((m) => <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-lg border py-2 text-sm ${months === m ? "border-ink bg-sun/20 font-semibold" : "border-line"}`}>{m} months</button>)}</div>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Pay today</dt><dd className="num font-semibold">{naira(downAmt)}</dd></div>
              <div className="flex justify-between"><dt>Financed by partner</dt><dd className="num">{naira(rest)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt>About {naira(Math.ceil(rest / months))} a month</dt><dd className="text-mute">before interest</dd></div>
            </dl>
            <p className="mt-4 text-xs text-mute">Interest and final terms are set by the lending partner after they assess your application. This is an estimate, not an offer.</p>
          </div>
          <form className="space-y-3 rounded-2xl border border-line bg-paper p-5" onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            try { await api("/finance", { body: { ...f, downPct: down, months, items: items.map((l) => ({ id: l.id, qty: l.qty })) } }); setDone(true); } catch (x) { setErr((x as Error).message); }
          }}>
            <p className="font-semibold">Your details</p>
            <Field label="Full name"><input className="field" required value={f.name} onChange={set("name")} /></Field>
            <Field label="Phone number"><input className="field" type="tel" required placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} /></Field>
            <Field label="Email (optional)"><input className="field" type="email" value={f.email} onChange={set("email")} /></Field>
            <Field label="Work"><select className="field" value={f.employment} onChange={set("employment")}><option value="">Choose</option><option>Salaried</option><option>Self-employed / business owner</option><option>Freelancer / remote worker</option><option>Student</option><option>Other</option></select></Field>
            <Field label="Monthly income"><select className="field" value={f.incomeBand} onChange={set("incomeBand")}><option value="">Choose</option><option>Under ₦200k</option><option>₦200k – ₦500k</option><option>₦500k – ₦1m</option><option>₦1m – ₦3m</option><option>Above ₦3m</option></select></Field>
            {err && <p role="alert" className="text-sm text-flare">{err}</p>}
            <button className="btn btn-sun w-full">Send request</button>
          </form>
        </div>
      )}
    </div>
  );
}
