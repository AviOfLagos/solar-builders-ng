"use client";
import { useState } from "react";

/** Copy-link + WhatsApp share for any page we want people to pass around. */
export function Share({ path, text, compact = false }: { path: string; text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? new URL(path, location.origin).toString() : path;
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "rounded-xl border border-line bg-haze p-3"}`}>
      {!compact && <input readOnly value={url} className="field min-w-[14rem] flex-1 basis-full !bg-white text-sm sm:basis-auto" aria-label="Link" onFocus={(e) => e.target.select()} />}
      <button type="button" className="btn btn-ink !py-2 text-sm" onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copied" : "Copy link"}</button>
      <a className="btn btn-ghost !py-2 text-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>Share on WhatsApp</a>
    </div>
  );
}
