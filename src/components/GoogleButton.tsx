"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GIS = {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean; itp_support?: boolean }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};

let loader: Promise<GIS> | null = null;
function loadGis() {
  loader ??= new Promise<GIS>((resolve, reject) => {
    const w = window as unknown as { google?: GIS };
    if (w.google?.accounts) return resolve(w.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("Google sign-in didn't load")));
    s.onerror = () => { loader = null; reject(new Error("Google sign-in didn't load. Check your connection.")); };
    document.head.appendChild(s);
  });
  return loader;
}

/** "Continue with Google". Hidden until the Google client id is configured. */
export function GoogleButton({ onDone, text = "continue_with" }: { onDone: (r: { created: boolean }) => void; text?: "continue_with" | "signin_with" | "signup_with" }) {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!CLIENT_ID || !box.current) return;
    let alive = true;
    loadGis().then((g) => {
      if (!alive || !box.current) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        itp_support: true,
        callback: async ({ credential }) => {
          setBusy(true); setErr("");
          try { done.current(await api<{ created: boolean }>("/auth/google", { body: { credential } })); }
          catch (e) { setErr((e as Error).message); }
          finally { setBusy(false); }
        },
      });
      g.accounts.id.renderButton(box.current, { theme: "outline", size: "large", shape: "pill", text, width: 300 });
    }).catch((e) => alive && setErr((e as Error).message));
    return () => { alive = false; };
  }, [text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={box} className="min-h-[44px]" aria-busy={busy} />
      {busy && <p className="text-sm text-mute">Signing you in…</p>}
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
    </div>
  );
}
