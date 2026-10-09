"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/client";
import { isEmail } from "@/lib/format";
import { Field } from "@/components/Field";

export default function ResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [f, setF] = useState({ email: "", code: "", password: "" });
  const [err, setErr] = useState<{ msg: string; fields?: Record<string, string> }>({ msg: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF((x) => ({ ...x, [k]: e.target.value })); setErr({ msg: "" }); };

  async function send() {
    if (!isEmail(f.email.trim())) { setErr({ msg: "", fields: { email: "Enter a valid email." } }); return; }
    setBusy(true);
    try { await api("/auth/reset", { body: { email: f.email.trim() } }); setStep("code"); setErr({ msg: "" }); }
    catch (x) { setErr({ msg: (x as Error).message }); }
    setBusy(false);
  }
  async function confirm() {
    const e: Record<string, string> = {};
    if (f.code.replace(/\D/g, "").length !== 6) e.code = "Enter the 6-digit code.";
    if (f.password.length < 8 || f.password.length > 128 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Use 8+ characters with a letter and a number.";
    if (Object.keys(e).length) { setErr({ msg: "", fields: e }); return; }
    setBusy(true);
    try { await api("/auth/reset/confirm", { body: { email: f.email.trim(), code: f.code, password: f.password } }); router.push("/account"); return; }
    catch (x) { const ex = x as ApiError; setErr({ msg: ex.message, fields: ex.fields }); }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-ink-2">{step === "email" ? "We'll email you a 6-digit code." : `If ${f.email.trim()} has an account, a code is on its way. It works for 15 minutes.`}</p>
        <form noValidate className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); if (busy) return; if (step === "email") void send(); else void confirm(); }}>
          {step === "email" ? (
            <Field label="Email" error={err.fields?.email}><input className="field" type="email" inputMode="email" autoComplete="email" maxLength={120} value={f.email} onChange={set("email")} /></Field>
          ) : (
            <>
              <Field label="Code from the email" error={err.fields?.code}><input className="field num tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={f.code} onChange={set("code")} /></Field>
              <Field label="New password" hint="At least 8 characters, with a letter and a number." error={err.fields?.password}><input className="field" type="password" autoComplete="new-password" maxLength={128} value={f.password} onChange={set("password")} /></Field>
            </>
          )}
          {err.msg && <p role="alert" className="text-sm text-flare">{err.msg}</p>}
          <button className="btn btn-ink w-full" disabled={busy}>{busy ? "Please wait…" : step === "email" ? "Send code" : "Set new password"}</button>
        </form>
        <p className="mt-4 text-center text-sm">
          {step === "code" && <><button className="underline" disabled={busy} onClick={send}>Send a new code</button> · </>}
          <Link className="underline" href="/account">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
