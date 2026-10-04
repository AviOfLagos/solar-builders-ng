"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/client";
import { naira, isEmail, isName } from "@/lib/format";
import { StripePay, successUrl } from "@/components/StripePay";
import { PayWith, usePayOptions, defaultProvider, goToPaystack, type Provider } from "@/components/PayWith";
import { Field } from "@/components/Field";

const AMOUNTS = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export default function GiftCards() {
  const router = useRouter();
  const [amount, setAmount] = useState(100_000);
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
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_420px]">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Solar gift cards</h1>
        <p className="mt-3 text-lg text-ink-2">Give light for birthdays, weddings, new homes or staff rewards. They spend it on any product or package, and they can top it up with their own card.</p>
        <div className="mt-8 rounded-2xl bg-ink p-6 text-white">
          <p className="text-sm text-sun">Solar Builders NG gift card</p>
          <p className="font-display num mt-6 text-5xl font-bold">{naira(amount)}</p>
          <p className="mt-6 text-sm text-white/70">{f.toName ? `For ${f.toName}` : "For someone you love"}{f.fromName ? ` · from ${f.fromName}` : ""}</p>
        </div>
        <div className="mt-10 rounded-2xl border border-line bg-paper p-5">
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
      <div className="h-fit rounded-2xl border border-line bg-paper p-5">
        {pay ? (
          <><p className="mb-3 text-sm">Gift card for <b>{f.toName || "them"}</b>. <button className="underline" onClick={() => setPay(null)}>Edit</button></p><StripePay clientSecret={pay.clientSecret} amount={pay.amount} label="Buy gift card" onPaid={(id, secret) => router.push(successUrl(id, secret))} /></>
        ) : (
          <form noValidate className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !validate()) return;
            setErr(""); setBusy(true);
            try {
              const d = await api<{ clientSecret?: string; authorizationUrl?: string; amount: number }>("/gift-cards", { body: { ...f, amount, provider: method } });
              if (d.authorizationUrl) { goToPaystack(d.authorizationUrl); return; }
              if (d.clientSecret) setPay({ clientSecret: d.clientSecret, amount: d.amount });
            } catch (x) { setErr((x as Error).message); setErrors((x as ApiError).fields || {}); }
            setBusy(false);
          }}>
            <p className="font-semibold">Amount</p>
            <div className="grid grid-cols-3 gap-2">{AMOUNTS.map((a) => <button type="button" key={a} onClick={() => setAmount(a)} className={`rounded-lg border py-2 text-sm ${amount === a ? "border-ink bg-sun/20 font-semibold" : "border-line"}`}>{naira(a)}</button>)}</div>
            <Field label="Or enter an amount (₦)" error={errors.amount}><input className="field num" type="number" inputMode="numeric" min={10000} max={5000000} step={1} value={amount > 0 ? amount : ""} onChange={(e) => setAmount(Math.floor(Number(e.target.value)))} /></Field>
            <Field label="Your name" error={errors.fromName}><input className="field" maxLength={60} autoComplete="name" value={f.fromName} onChange={set("fromName")} /></Field>
            <Field label="Your email" error={errors.fromEmail}><input className="field" type="email" inputMode="email" autoComplete="email" maxLength={120} value={f.fromEmail} onChange={set("fromEmail")} /></Field>
            <Field label="Their name (optional)" error={errors.toName}><input className="field" maxLength={60} value={f.toName} onChange={set("toName")} /></Field>
            <Field label="Their email (optional)" error={errors.toEmail}><input className="field" type="email" inputMode="email" maxLength={120} value={f.toEmail} onChange={set("toEmail")} /></Field>
            <Field label="Message (optional)"><textarea className="field" rows={2} maxLength={300} value={f.message} onChange={set("message")} /></Field>
            <PayWith options={opts} value={method} onChange={setPicked} disabled={busy} />
            {err && <p role="alert" className="text-sm text-flare">{err}</p>}
            <button className="btn btn-sun w-full" disabled={busy || !opts || (!opts.naira && !opts.intl)}>{busy ? "Please wait…" : "Continue to payment"}</button>
            <p className="text-center text-xs text-mute">You&apos;ll get the code on the next screen to share. Gift cards can&apos;t be exchanged for cash.</p>
          </form>
        )}
      </div>
    </div>
  );
}
