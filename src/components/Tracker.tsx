"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One id per browser tab, kept only for this tab. Nothing that identifies a person. */
function sid() {
  try {
    let v = sessionStorage.getItem("sb-sid");
    if (!v) { v = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("sb-sid", v); }
    return v;
  } catch { return ""; }
}
function send(kind: "view" | "click", path: string, name = "", ref = "") {
  try {
    fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: sid(), kind, path, name, ref }), keepalive: true }).catch(() => {});
  } catch {}
}

/** Counts page views and button/link clicks for the admin funnel. Skips the admin and team pages. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/admin") || path.startsWith("/team")) return;
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? new URL(document.referrer).hostname : "";
    send("view", path, "", ref);
  }, [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track], a, button");
      if (!el || location.pathname.startsWith("/admin") || location.pathname.startsWith("/team")) return;
      const name = (el.dataset.track || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (name) send("click", location.pathname, name);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
