"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Account() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "";
  const [me, setMe] = useState<{ user: { email: string } | null } | null>(null);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/me").then((r) => r.json()).then(setMe); }, []);

  if (!me) return <Wrap><p className="text-mute">Loading…</p></Wrap>;
  if (me.user)
    return (
      <Wrap title="Your account">
        <p className="text-ink-2">Signed in as <b>{me.user.email}</b>.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/cards" className="btn btn-ink">Saved cards</Link>
          <Link href="/shop" className="btn btn-ghost">Shop</Link>
          <button className="btn btn-ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); setMe({ user: null }); }}>Sign out</button>
        </div>
      </Wrap>
    );

  return (
    <Wrap title="Sign in with your email" intro="No password. We'll email you a 6-digit code. Signing in lets you see and use the cards you've saved.">
      {step === "email" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setMsg("");
            const r = await fetch("/api/auth/request-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
            const d = await r.json(); setBusy(false);
            if (!r.ok) return setMsg(d.error);
            setDevCode(d.devCode || ""); setStep("code");
          }}
        >
          <label className="block text-sm font-medium" htmlFor="em">Email</label>
          <input id="em" className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-ink w-full" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setMsg("");
            const r = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
            const d = await r.json(); setBusy(false);
            if (!r.ok) return setMsg(d.error);
            if (next.startsWith("/")) router.push(next); else router.push("/account/cards");
          }}
        >
          <p className="text-sm text-ink-2">We sent a code to <b>{email}</b>. <button type="button" className="underline" onClick={() => setStep("email")}>Change</button></p>
          {devCode && <p className="rounded-lg bg-sun/25 p-2 text-sm">Test mode: your code is <b className="num">{devCode}</b></p>}
          <label className="block text-sm font-medium" htmlFor="code">6-digit code</label>
          <input id="code" className="field num text-center text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-ink w-full" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
        </form>
      )}
      {msg && <p role="alert" className="mt-3 text-sm text-flare">{msg}</p>}
    </Wrap>
  );
}

function Wrap({ title, intro, children }: { title?: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
        {title && <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>}
        {intro && <p className="mt-2 text-ink-2">{intro}</p>}
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Account /></Suspense>;
}
