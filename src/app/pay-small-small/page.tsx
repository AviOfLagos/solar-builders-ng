"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartLines } from "@/components/CartDrawer";
import { Field } from "@/components/Field";
import { api, saveLead, type ApiError } from "@/lib/client";
import { naira, isEmail, isName, NG_PHONE, normalizePhone } from "@/lib/format";
import { FINANCE } from "@/config/store";

export default function PaySmallSmall() {
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [down, setDown] = useState(FINANCE.downPayments[0]);
  const [months, setMonths] = useState(6);
  const [f, setF] = useState({ name: "", phone: "", email: "", employment: "", incomeBand: "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cart lives in localStorage, so render only after mount
    setMounted(true); api<{ user: { name: string; email: string; phone: string } | null }>("/me").then((m) => m.user && setF((x) => ({ ...x, name: m.user!.name, email: m.user!.email, phone: m.user!.phone || "" }))).catch(() => {}); }, []);
  const downAmt = Math.round((subtotal * down) / 100);
  const rest = subtotal - downAmt;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: "" }); };
  function validate() {
    const e: Record<string, string> = {};
    if (!isName(f.name)) e.name = "Enter your name.";
    if (!NG_PHONE.test(normalizePhone(f.phone))) e.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
    if (f.email && !isEmail(f.email.trim())) e.email = "Enter a valid email or leave it empty.";
    if (!f.employment) e.employment = "Choose one.";
    if (!f.incomeBand) e.incomeBand = "Choose one.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Pay small small</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">Get your solar now. Pay a part today and spread the rest over 3 to 12 months with our partner lender. We deliver once you&apos;re approved.</p>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["Pick your kit", "Add a package or products to your cart."], ["Choose a plan", "Your down payment and how many months."], ["Get approved", "Our lending partner calls you, usually within 2 working days."]].map(([t, d], i) => (
          <li key={t} className="rounded-xl bg-paper p-5"><span className="font-display grid h-9 w-9 place-items-center rounded-full bg-sun font-bold">{i + 1}</span><p className="mt-3 font-semibold">{t}</p><p className="text-sm text-ink-2">{d}</p></li>
        ))}
      </ol>
      {!mounted ? null : !items.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-paper p-8 text-center"><p>Your cart is empty. Pick a kit first.</p><Link href="/packages" className="btn btn-ink mt-4">See packages</Link></div>
      ) : subtotal < FINANCE.minTotal ? (
        <div className="mt-10 card p-8 text-center"><p>Pay small small starts from {naira(FINANCE.minTotal)}. Your cart is {naira(subtotal)}. <Link className="underline" href="/fund/new">Go Solar Me with friends</Link> instead?</p></div>
      ) : done ? (
        <div className="mt-10 rounded-2xl bg-leaf/10 p-8"><p className="font-display text-2xl font-bold">Request sent.</p><p className="mt-2 text-ink-2">We&apos;ll call you on {f.phone} to complete the application with our lending partner. Nothing has been charged.</p></div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="card p-5">
            <p className="font-semibold">Your plan for {naira(subtotal)}</p>
            <p className="mt-4 text-sm">Down payment</p>
            <div className="mt-2 grid grid-cols-3 gap-2">{FINANCE.downPayments.map((d) => <button key={d} type="button" onClick={() => setDown(d)} className={`rounded-xl border py-2 text-sm ${down === d ? "border-ink bg-mint-tint font-semibold" : "border-line"}`}>{d}%</button>)}</div>
            <p className="mt-4 text-sm">Spread over</p>
            <div className="mt-2 grid grid-cols-3 gap-2">{FINANCE.months.map((m) => <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-xl border py-2 text-sm ${months === m ? "border-ink bg-mint-tint font-semibold" : "border-line"}`}>{m} months</button>)}</div>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Pay today</dt><dd className="num font-semibold">{naira(downAmt)}</dd></div>
              <div className="flex justify-between"><dt>Financed by partner</dt><dd className="num">{naira(rest)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt>About {naira(Math.ceil(rest / months))} a month</dt><dd className="text-mute">before interest</dd></div>
            </dl>
            <p className="mt-4 text-xs text-mute">Interest and final terms are set by the lending partner after they assess your application. This is an estimate, not an offer.</p>
          </div>
          <form noValidate className="space-y-3 card p-5" onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !validate()) return;
            setErr(""); setBusy(true);
            const lines = items.map((l) => ({ id: l.id, qty: l.qty }));
            try {
              await api("/finance", { body: { ...f, downPct: down, months, items: lines } });
              saveLead({ name: f.name, phone: f.phone, email: f.email, consent: true, source: "finance", items: lines }).catch(() => {});
              setDone(true);
            } catch (x) { setErr((x as Error).message); setErrors((x as ApiError).fields || {}); }
            setBusy(false);
          }}>
            <p className="font-semibold">Your details</p>
            <Field label="Phone number" error={errors.phone}><input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} /></Field>
            <Field label="Full name" error={errors.name}><input className="field" maxLength={80} autoComplete="name" value={f.name} onChange={set("name")} /></Field>
            <Field label="Email (optional)" error={errors.email}><input className="field" type="email" inputMode="email" maxLength={120} value={f.email} onChange={set("email")} /></Field>
            <Field label="Work" error={errors.employment}><select className="field" value={f.employment} onChange={set("employment")}><option value="">Choose</option>{FINANCE.employment.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Monthly income" error={errors.incomeBand}><select className="field" value={f.incomeBand} onChange={set("incomeBand")}><option value="">Choose</option>{FINANCE.incomeBands.map((o) => <option key={o}>{o}</option>)}</select></Field>
            {err && <p role="alert" className="text-sm text-flare">{err}</p>}
            <button className="btn btn-sun w-full" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
