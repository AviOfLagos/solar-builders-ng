"use client";
import { useState } from "react";
import { STORE } from "@/config/store";

/** Copy-link + WhatsApp share for any page we want people to pass around. Same URL on server and browser. */
export function Share({ path, text, compact = false, images }: { path: string; text: string; compact?: boolean; images?: { label: string; href: string }[] }) {
  const [copied, setCopied] = useState(false);
  const url = new URL(path, STORE.url).toString();
  return (
    <div className={`space-y-2 ${compact ? "" : "rounded-xl border border-line bg-haze p-3"}`}>
      <div className="flex flex-wrap gap-2">
        {!compact && <input readOnly value={url} className="field min-w-0 flex-1 basis-full !bg-white text-sm sm:basis-auto" aria-label="Link" onFocus={(e) => e.target.select()} />}
        <button type="button" className="btn btn-ink !py-2 text-sm" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy this link", url); }
        }}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn btn-ghost !py-2 text-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>Share on WhatsApp</a>
      </div>
      {images && images.length > 0 && (
        <p className="text-xs text-mute">Picture for your status or story: {images.map((im, i) => <span key={im.href}>{i > 0 && " · "}<a className="font-semibold text-ink underline" href={im.href} target="_blank" rel="noopener" download>{im.label}</a></span>)}</p>
      )}
    </div>
  );
}
