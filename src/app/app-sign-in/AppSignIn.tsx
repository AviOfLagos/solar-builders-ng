"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { GoogleButton } from "@/components/GoogleButton";

type Me = { user: { name: string; email: string } | null };

/** Opened by the phone app. Signs in with Google here, then hands a one-time code back to the app. */
export function AppSignIn({ state, go }: { state: string; go: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = state.length >= 16;

  const hand = async () => {
    setBusy(true); setErr("");
    try {
      const { code } = await api<{ code: string }>("/auth/app-code", { body: { state } });
      window.location.href = `gosolarme://auth?code=${encodeURIComponent(code)}`;
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  useEffect(() => { api<Me>("/me").then(setMe).catch(() => setMe({ user: null })); }, []);
  // Back from Google: hand over straight away.
  useEffect(() => { if (go && valid && me?.user) { const t = setTimeout(hand, 0); return () => clearTimeout(t); } }, [go, valid, me]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!valid) return <main className="mx-auto max-w-sm p-8 text-center"><p>Open this from the Go Solar Me app.</p></main>;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="font-display text-3xl">Continue to the app</h1>
      {!me ? <p className="text-mute">One moment…</p> : go && me.user ? <p className="text-mute">Taking you back to the app…</p> : (
        <>
          <p className="text-ink-2">Sign in with Google and we&apos;ll send you straight back to Go Solar Me.</p>
          <GoogleButton next={`/app-sign-in?state=${encodeURIComponent(state)}&go=1`} text="continue_with" />
          {me.user && <button disabled={busy} onClick={hand} className="btn btn-ink w-full">Continue as {me.user.email}</button>}
        </>
      )}
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
    </main>
  );
}
