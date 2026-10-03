"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { StripePay } from "@/components/StripePay";
import { Field } from "@/components/Field";

export function Contribute({ poolId, remaining }: { poolId: string; remaining: number }) {
  const router = useRouter();
  const presets = [5000, 10000, 25000, 50000].filter((x) => x < remaining);
  const [amount, setAmount] = useState(presets[1] ?? remaining);
  const [f, setF] = useState({ name: "", email: "", message: "", anonymous: false });
  const [pay, setPay] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (pay) return <div><p className="mb-3 text-sm">Chipping in <b className="num">{naira(pay.amount)}</b>. <button className="underline" onClick={() => setPay(null)}>Change</button></p><StripePay clientSecret={pay.clientSecret} amount={pay.amount} label="Chip in" onPaid={(id) => router.push(`/checkout/success?payment_intent=${id}`)} /></div>;

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      try { setPay(await api<{ clientSecret: string; amount: number }>(`/pools/${poolId}/contribute`, { body: { ...f, amount } })); } catch (x) { setErr((x as Error).message); }
      setBusy(false);
    }}>
      <p className="font-semibold">Chip in</p>
      <div className="grid grid-cols-3 gap-2">
        {[...presets.slice(0, 2), remaining].map((v, i) => (
          <button type="button" key={i} onClick={() => setAmount(v)} className={`rounded-lg border px-2 py-2 text-sm ${amount === v ? "border-ink bg-sun/20 font-semibold" : "border-line"}`}>{v === remaining ? "Finish it" : naira(v)}</button>
        ))}
      </div>
      <Field label="Amount (₦)"><input className="field num" type="number" min={1000} max={remaining} step={500} value={amount} onChange={(e) => setAmount(Math.floor(+e.target.value))} /></Field>
      <Field label="Your name"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Email for your receipt"><input className="field" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Message (optional)"><input className="field" maxLength={200} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#10213B]" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Hide my name</label>
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
      <button className="btn btn-sun w-full" disabled={busy}>{busy ? "Please wait…" : `Continue with ${naira(amount || 0)}`}</button>
    </form>
  );
}
