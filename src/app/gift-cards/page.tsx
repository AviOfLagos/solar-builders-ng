"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { StripePay } from "@/components/StripePay";
import { Field } from "@/components/Field";

const AMOUNTS = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export default function GiftCards() {
  const router = useRouter();
  const [amount, setAmount] = useState(100_000);
  const [f, setF] = useState({ fromName: "", fromEmail: "", toName: "", toEmail: "", message: "" });
  const [pay, setPay] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [err, setErr] = useState("");
  const [check, setCheck] = useState({ code: "", result: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
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
          <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { const g = await api<{ balance: number }>(`/gift-cards/${encodeURIComponent(check.code.trim())}`); setCheck({ ...check, result: `Balance: ${naira(g.balance)}` }); } catch (x) { setCheck({ ...check, result: (x as Error).message }); } }}>
            <input className="field" placeholder="Gift card code" value={check.code} onChange={(e) => setCheck({ code: e.target.value, result: "" })} aria-label="Gift card code" />
            <button className="btn btn-ghost">Check</button>
          </form>
          {check.result && <p className="mt-2 text-sm">{check.result}</p>}
        </div>
      </div>
      <div className="h-fit rounded-2xl border border-line bg-paper p-5">
        {pay ? (
          <><p className="mb-3 text-sm">Gift card for <b>{f.toName || "them"}</b>. <button className="underline" onClick={() => setPay(null)}>Edit</button></p><StripePay clientSecret={pay.clientSecret} amount={pay.amount} label="Buy gift card" onPaid={(id) => router.push(`/checkout/success?payment_intent=${id}`)} /></>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setErr(""); try { setPay(await api("/gift-cards", { body: { ...f, amount } })); } catch (x) { setErr((x as Error).message); } }}>
            <p className="font-semibold">Amount</p>
            <div className="grid grid-cols-3 gap-2">{AMOUNTS.map((a) => <button type="button" key={a} onClick={() => setAmount(a)} className={`rounded-lg border py-2 text-sm ${amount === a ? "border-ink bg-sun/20 font-semibold" : "border-line"}`}>{naira(a)}</button>)}</div>
            <Field label="Or enter an amount (₦)"><input className="field num" type="number" min={10000} step={1} value={amount} onChange={(e) => setAmount(Math.floor(+e.target.value))} /></Field>
            <Field label="Your name"><input className="field" value={f.fromName} onChange={set("fromName")} /></Field>
            <Field label="Your email"><input className="field" type="email" required value={f.fromEmail} onChange={set("fromEmail")} /></Field>
            <Field label="Their name"><input className="field" value={f.toName} onChange={set("toName")} /></Field>
            <Field label="Their email (optional)"><input className="field" type="email" value={f.toEmail} onChange={set("toEmail")} /></Field>
            <Field label="Message (optional)"><textarea className="field" rows={2} maxLength={300} value={f.message} onChange={set("message")} /></Field>
            {err && <p role="alert" className="text-sm text-flare">{err}</p>}
            <button className="btn btn-sun w-full">Continue to payment</button>
            <p className="text-center text-xs text-mute">You'll get the code on the next screen to share.</p>
          </form>
        )}
      </div>
    </div>
  );
}
