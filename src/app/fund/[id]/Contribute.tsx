"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/client";
import { naira, isEmail, isName } from "@/lib/format";
import { POOL } from "@/config/store";
import { StripePay, successUrl } from "@/components/StripePay";
import { PayWith, usePayOptions, defaultProvider, goToPaystack, type Provider } from "@/components/PayWith";
import { Field } from "@/components/Field";

type Pool = { id: string; kind: "public" | "squad"; remaining: number; items: { id: string; name: string; price: number; qty: number; funded: number }[]; shares: { id: string; name: string; amount: number; paid: boolean }[] };

export function Contribute({ pool }: { pool: Pool }) {
  const router = useRouter();
  const { remaining } = pool;
  const chips = POOL.chipIns.filter((x) => x < remaining);
  // "Fund a part" only makes sense when the kit has more than one part.
  const multiPart = pool.items.length > 1 || (pool.items[0]?.qty ?? 0) > 1;
  const pieces = multiPart ? pool.items.filter((i) => i.price <= remaining && i.funded < i.qty) : [];
  const openShares = pool.shares.filter((s) => !s.paid);
  const [mode, setMode] = useState<"amount" | "piece" | "share">(pool.kind === "squad" ? "share" : "amount");
  const [amount, setAmount] = useState<number>(chips[1] ?? chips[0] ?? remaining);
  const [piece, setPiece] = useState(pieces[0]?.id ?? "");
  const [share, setShare] = useState(openShares[0]?.id ?? "");
  const [f, setF] = useState({ name: "", email: "", message: "", anonymous: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pay, setPay] = useState<{ clientSecret: string; amount: number } | null>(null);
  const opts = usePayOptions();
  const [picked, setPicked] = useState<Provider | null>(null);
  const method = picked ?? defaultProvider(opts);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (pay)
    return (
      <div>
        <p className="mb-3 text-sm">Chipping in <b className="num">{naira(pay.amount)}</b>. <button type="button" className="underline" onClick={() => setPay(null)}>Change</button></p>
        <StripePay clientSecret={pay.clientSecret} amount={pay.amount} label="Chip in" onPaid={(id, secret) => router.push(successUrl(id, secret))} />
      </div>
    );

  const value = mode === "piece" ? pool.items.find((i) => i.id === piece)?.price ?? 0 : mode === "share" ? openShares.find((s) => s.id === share)?.amount ?? 0 : amount;
  const min = Math.min(1000, remaining);

  function validate() {
    const e: Record<string, string> = {};
    if (!isEmail(f.email.trim())) e.email = "Enter your email for the receipt.";
    if (f.name.trim() && !isName(f.name)) e.name = "Enter your name, or tick Hide my name.";
    if (mode === "amount" && (!Number.isInteger(amount) || amount < min || amount > remaining)) e.amount = `Enter ${naira(min)} to ${naira(remaining)}.`;
    if (mode === "piece" && !piece) e.piece = "Pick a part.";
    if (mode === "share" && !share) e.share = "Pick whose share you're paying.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <form noValidate className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (busy || !validate()) return;
      setErr(""); setBusy(true);
      try {
        const d = await api<{ clientSecret?: string; authorizationUrl?: string; amount: number }>(`/pools/${pool.id}/contribute`, {
          body: { ...f, provider: method, amount: mode === "amount" ? amount : undefined, piece: mode === "piece" ? piece : undefined, shareId: mode === "share" ? share : undefined },
        });
        // Naira: finish on Paystack's page, which brings them back to the thank-you page.
        if (d.authorizationUrl) { goToPaystack(d.authorizationUrl); return; }
        if (d.clientSecret) setPay({ clientSecret: d.clientSecret, amount: d.amount });
      } catch (x) { const ex = x as ApiError; setErr(ex.message); setErrors(ex.fields || {}); if (ex.status === 409) router.refresh(); }
      setBusy(false);
    }}>
      <p className="font-semibold">{pool.kind === "squad" ? "Pay a share" : "Chip in"}</p>

      {pool.kind === "squad" ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">Whose share</legend>
          {pool.shares.map((s) => (
            <label key={s.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${s.paid ? "border-line bg-haze text-mute" : share === s.id ? "border-ink bg-mint-tint" : "border-line"}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="share" className="accent-[#17201B]" disabled={s.paid} checked={share === s.id} onChange={() => setShare(s.id)} />
                {s.name}
              </span>
              <span className="num font-semibold">{s.paid ? "Paid ✓" : naira(s.amount)}</span>
            </label>
          ))}
          {errors.share && <p className="text-sm text-flare">{errors.share}</p>}
        </fieldset>
      ) : (
        <>
          {pieces.length > 0 && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-haze p-1 text-sm" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "amount"} className={`rounded-md py-1.5 ${mode === "amount" ? "bg-white font-semibold shadow-sm" : ""}`} onClick={() => setMode("amount")}>Any amount</button>
              <button type="button" role="tab" aria-selected={mode === "piece"} className={`rounded-md py-1.5 ${mode === "piece" ? "bg-white font-semibold shadow-sm" : ""}`} onClick={() => setMode("piece")}>Fund a part</button>
            </div>
          )}
          {mode === "amount" ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[...chips.slice(0, 2), remaining].map((v, i) => (
                  <button type="button" key={i} onClick={() => setAmount(v)} className={`rounded-xl border px-2 py-2 text-sm ${amount === v ? "border-ink bg-mint-tint font-semibold" : "border-line"}`}>{v === remaining ? "The rest" : naira(v)}</button>
                ))}
              </div>
              <Field label="Or type an amount (₦)" error={errors.amount}><input className="field num" type="number" inputMode="numeric" min={min} max={remaining} step={1} value={Number.isFinite(amount) && amount > 0 ? amount : ""} onChange={(e) => setAmount(Math.floor(Number(e.target.value)))} /></Field>
            </>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Which part</legend>
              {pieces.map((i) => (
                <label key={i.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${piece === i.id ? "border-ink bg-mint-tint" : "border-line"}`}>
                  <span className="flex min-w-0 items-center gap-2"><input type="radio" name="piece" className="accent-[#17201B]" checked={piece === i.id} onChange={() => setPiece(i.id)} /><span className="line-clamp-2">{i.name}{i.qty > 1 ? ` (${i.funded} of ${i.qty} funded)` : ""}</span></span>
                  <span className="num shrink-0 font-semibold">{naira(i.price)}</span>
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}

      <Field label="Your name" error={errors.name}><input className="field" maxLength={60} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Email for your receipt" error={errors.email}><input className="field" type="email" inputMode="email" autoComplete="email" maxLength={120} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Message (optional)"><input className="field" maxLength={200} placeholder="e.g. Happy birthday Mummy!" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#17201B]" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Hide my name on the page</label>
      <PayWith options={opts} value={method} onChange={setPicked} disabled={busy} />
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <button className="btn btn-sun w-full" disabled={busy || value <= 0 || !opts || (!opts.naira && !opts.intl)}>{busy ? "Please wait…" : `Continue with ${naira(value > 0 ? value : 0)}`}</button>
      {opts && !opts.naira && !opts.intl && <p className="text-center text-xs text-flare">Online payments are being switched on. Check back soon.</p>}
      <p className="text-center text-xs text-mute">No account needed. If the kit gets funded before your payment lands, we refund you automatically.</p>
    </form>
  );
}
