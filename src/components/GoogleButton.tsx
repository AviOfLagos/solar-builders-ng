"use client";
import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GIS = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
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

const cookie = (k: string, v: string) => { document.cookie = `${k}=${encodeURIComponent(v)}; path=/; max-age=600; SameSite=None; Secure`; };

/**
 * "Continue with Google". Uses Google's redirect mode, so it also works inside WhatsApp and
 * Instagram browsers where pop-ups are blocked. Hidden until the Google client id is configured.
 */
export function GoogleButton({ next = "/account", text = "continue_with" }: { next?: string; text?: "continue_with" | "signin_with" | "signup_with" }) {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!CLIENT_ID || !box.current) return;
    let alive = true;
    loadGis().then((g) => {
      if (!alive || !box.current) return;
      const nonce = crypto.randomUUID();
      cookie("sb_gnonce", nonce);
      cookie("sb_next", /^\/(?![/\\])/.test(next) ? next : "/account");
      g.accounts.id.initialize({ client_id: CLIENT_ID, ux_mode: "redirect", login_uri: `${location.origin}/api/v1/auth/google/redirect`, nonce, itp_support: true });
      g.accounts.id.renderButton(box.current, { theme: "outline", size: "large", shape: "rectangular", text, width: 320, logo_alignment: "center" });
    }).catch((e) => alive && setErr((e as Error).message));
    return () => { alive = false; };
  }, [next, text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={box} className="min-h-[44px]" />
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
    </div>
  );
}
