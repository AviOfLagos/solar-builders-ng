"use client";
import { useEffect, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";

const CODE = /^[a-z0-9]{6,16}$/i;

/**
 * Turns whatever someone pasted (a full link, one without https, or a bare code) into the page to
 * open. A bare code is checked against shared lists first, then Go Solar Me pages.
 */
export async function resolveLink(raw: string): Promise<string> {
  const t = raw.trim().replace(/[)\].,]+$/, "");
  if (!t) throw new Error("Paste a link or a code.");
  const resume = t.match(/[?&]resume=([a-z0-9]+)/i);
  if (resume) return `/cart?resume=${resume[1]}`;
  const m = t.match(/\/(b|fund|s)\/([a-z0-9-]{2,40})/i);
  if (m) return `/${m[1].toLowerCase()}/${m[1].toLowerCase() === "b" ? m[2] : m[2].toLowerCase()}`;
  if (!CODE.test(t)) throw new Error("That doesn't look like one of our links. It should look like solar.nexprove.com/b/ab12cd34");
  const code = t.toLowerCase();
  const found = async (p: string) => (await fetch(`/api/v1/${p}/${code}`)).ok;
  if (await found("builds")) return `/b/${code}`;
  if (await found("pools")) return `/fund/${code}`;
  throw new Error("No list or page uses that code. Check it and try again.");
}

export function OpenLinkForm({ label = "Paste a link or code", onDone, autoFocus, compact }: { label?: string; onDone?: () => void; autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true); setErr("");
      try { const to = await resolveLink(v); onDone?.(); router.push(to); setV(""); } catch (x) { setErr((x as Error).message); }
      setBusy(false);
    }}>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <div className="mt-1.5 flex gap-2">
        <input id={id} className="field" value={v} autoFocus={autoFocus} onChange={(e) => { setV(e.target.value); setErr(""); }} placeholder={compact ? "Paste link or code" : "solar.nexprove.com/b/… or a code"} autoComplete="off" autoCapitalize="none" aria-invalid={!!err} />
        <button className="btn btn-ink shrink-0" disabled={busy}>{busy ? "…" : "Open"}</button>
      </div>
      {err ? <p role="alert" className="mt-1.5 text-sm text-flare">{err}</p> : !compact && <p className="mt-1.5 text-xs text-mute">Installer lists, Go Solar Me pages, stores and saved carts all work.</p>}
    </form>
  );
}

export function OpenLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Open a link">
      <button className="absolute inset-0 bg-ink/30" aria-label="Close" onClick={onClose} />
      <div ref={ref} className="rise relative m-3 w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint"><Icon name="link" /></span>
            <p className="mt-3 text-xl font-semibold">Got a link or code?</p>
            <p className="text-sm text-ink-2">From an installer, a friend&apos;s Go Solar Me page, or a saved cart.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-haze" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <OpenLinkForm label="Link or code" onDone={onClose} autoFocus />
      </div>
    </div>
  );
}
