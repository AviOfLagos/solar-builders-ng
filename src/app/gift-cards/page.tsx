"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepBar } from "@/components/ui/Flow";
import { Icon } from "@/components/ui/Icon";
import { api, type ApiError } from "@/lib/client";
import { naira, isEmail, isName } from "@/lib/format";
import { StripePay, successUrl } from "@/components/StripePay";
import { PayWith, usePayOptions, defaultProvider, goToPaystack, type Provider } from "@/components/PayWith";
import { Field } from "@/components/Field";

const AMOUNTS = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export default function Page() {
  return <Suspense><GiftCards /></Suspense>;
}

/** Two steps, like the app: pick an amount, then who it's from and to, and pay. ?amount= comes from a kit. */
function GiftCards() {
  const router = useRouter();
  const q = useSearchParams();
  const fromKit = Math.floor(Number(q.get("amount")) || 0);
  const [amount, setAmount] = useState(fromKit >= 10_000 && fromKit <= 5_000_000 ? fromKit : 100_000);
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ fromName: "", fromEmail: "", toName: "", toEmail: "", message: "" });
  const [pay, setPay] = useState<{ clientSecret: string; amount: number } | null>(null);
  const opts = usePayOptions();
  const [picked, setPicked] = useState<Provider | null>(null);
  const method = picked ?? defaultProvider(opts);
  const [err, setErr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState({ code: "", result: "", busy: false });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: "" }); };
  function validate() {
    const e: Record<string, string> = {};
    if (!Number.isInteger(amount) || amount < 10_000 || amount > 5_000_000) e.amount = "From ₦10,000 to ₦5,000,000.";
    if (!isName(f.fromName)) e.fromName = "Enter your name.";
    if (!isEmail(f.fromEmail.trim())) e.fromEmail = "Enter a valid email for your receipt.";
    if (f.toName && !isName(f.toName)) e.toName = "Enter their name or leave it empty.";
    if (f.toEmail && !isEmail(f.toEmail.trim())) e.toEmail = "Enter a valid email or leave it empty.";
    setErrors(e);
    return !Object.keys(e).length;
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_440px]">
      <div>
        <span className="tag">Gift cards</span>
        <h1 className="font-display mt-3 text-4xl leading-tight sm:text-6xl">Give <span className="hl">light</span>.</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-2">Give light for birthdays, weddings, new homes or staff rewards. They spend it on any product or package, and they can top it up with their own card.</p>
        <div className="relative mt-8 max-w-md overflow-hidden rounded-[2rem] bg-night p-7 text-white">
          <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/25" aria-hidden />
          <p className="flex items-center gap-2 text-sm text-mint"><Icon name="sun" size={18} />Solar Builders NG gift card</p>
          <p className="num mt-8 text-5xl font-light">{naira(amount)}</p>
          <p className="mt-6 text-sm text-white/70">{f.toName ? `For ${f.toName}` : "For someone you love"}{f.fromName ? ` · from ${f.fromName}` : ""}</p>
        </div>
      </div>
      <div className="card h-fit space-y-5 p-5 lg:sticky lg:top-24 lg:row-span-2">
        <StepBar step={pay ? 2 : step} total={2} onBack={step === 2 && !pay ? () => setStep(1) : undefined} label={pay ? "Last step: pay" : undefined} />
        {pay ? (
          <><p className="mb-3 text-sm">Gift card for <b>{f.toName || "them"}</b>. <button className="font-semibold underline" onClick={() => setPay(null)}>Edit</button></p><StripePay clientSecret={pay.clientSecret} amount={pay.amount} label="Buy gift card" onPaid={(id, secret) => router.push(successUrl(id, secret))} /></>
        ) : (
          <form noValidate className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            if (!validate()) { if (!Number.isInteger(amount) || amount < 10_000 || amount > 5_000_000) setStep(1); return; }
            setErr(""); setBusy(true);
            try {
              const d = await api<{ clientSecret?: string; authorizationUrl?: string; amount: number }>("/gift-cards", { body: { ...f, amount, provider: method } });
              if (d.authorizationUrl) { goToPaystack(d.authorizationUrl); return; }
              if (d.clientSecret) setPay({ clientSecret: d.clientSecret, amount: d.amount });
            } catch (x) { setErr((x as Error).message); setErrors((x as ApiError).fields || {}); }
            setBusy(false);
          }}>
            {step === 1 ? (<>
            <p className="font-display text-2xl">How much?</p>
            {fromKit > 0 && <p className="rounded-xl bg-mint-tint p-3 text-sm">Set to the price of the kit you picked. Change it any time.</p>}
            <div className="grid grid-cols-3 gap-2">{AMOUNTS.map((a) => <button type="button" key={a} aria-pressed={amount === a} onClick={() => { setAmount(a); setErrors({ ...errors, amount: "" }); }} className="chip num !justify-center">{naira(a)}</button>)}</div>
            <Field label="Or enter an amount (₦)" error={errors.amount}><input className="field num" type="number" inputMode="numeric" min={10000} max={5000000} step={1} value={amount > 0 ? amount : ""} onChange={(e) => setAmount(Math.floor(Number(e.target.value)))} /></Field>
            <button type="button" className="btn btn-ink w-full" onClick={() => {
              if (!Number.isInteger(amount) || amount < 10_000 || amount > 5_000_000) { setErrors({ ...errors, amount: "From ₦10,000 to ₦5,000,000." }); return; }
              setStep(2);
            }}>Next: who it&apos;s for<Icon name="arrow" size={18} /></button>
            </>) : (<>
            <p className="font-display text-2xl">From you, to them</p>
            <Field label="Your name" error={errors.fromName}><input className="field" maxLength={60} autoComplete="name" value={f.fromName} onChange={set("fromName")} /></Field>
            <Field label="Your email" error={errors.fromEmail}><input className="field" type="email" inputMode="email" autoComplete="email" maxLength={120} value={f.fromEmail} onChange={set("fromEmail")} /></Field>
            <Field label="Their name (optional)" error={errors.toName}><input className="field" maxLength={60} value={f.toName} onChange={set("toName")} /></Field>
            <Field label="Their email (optional)" error={errors.toEmail}><input className="field" type="email" inputMode="email" maxLength={120} value={f.toEmail} onChange={set("toEmail")} /></Field>
            <Field label="Message (optional)"><textarea className="field" rows={2} maxLength={300} value={f.message} onChange={set("message")} /></Field>
            <PayWith options={opts} value={method} onChange={setPicked} disabled={busy} />
            {err && <p role="alert" className="text-sm text-flare">{err}</p>}
            <button className="btn btn-ink w-full" disabled={busy || !opts || (!opts.naira && !opts.intl)}>{busy ? "Please wait…" : `Pay ${naira(amount)}`}</button>
            <p className="text-center text-xs text-mute">You&apos;ll get the code on the next screen to share. Gift cards can&apos;t be exchanged for cash.</p>
            </>)}
          </form>
        )}
      </div>
      <div>
        <div className="card h-fit max-w-md p-5">
          <p className="font-semibold">Check a balance</p>
          <form className="mt-3 flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const code = check.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (!code) { setCheck({ ...check, result: "Enter the code." }); return; }
            setCheck({ ...check, busy: true, result: "" });
            try { const g = await api<{ balance: number }>(`/gift-cards/${encodeURIComponent(code)}`); setCheck({ code, busy: false, result: `Balance: ${naira(g.balance)}` }); }
            catch (x) { setCheck({ code, busy: false, result: (x as Error).message }); }
          }}>
            <input className="field uppercase" maxLength={20} placeholder="Gift card code" value={check.code} onChange={(e) => setCheck({ code: e.target.value, result: "", busy: false })} aria-label="Gift card code" />
            <button className="btn btn-ghost" disabled={check.busy}>{check.busy ? "…" : "Check"}</button>
          </form>
          {check.result && <p className="mt-2 text-sm">{check.result}</p>}
        </div>
      </div>
    </div>
  );
}
