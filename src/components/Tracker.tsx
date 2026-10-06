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
function send(kind: "view" | "click", path: string, name = "", ref = "", utm = "") {
  try {
    fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: sid(), kind, path, name, ref, utm }), keepalive: true }).catch(() => {});
  } catch {}
}

/** A named moment that isn't a plain click (helper shown, link opened, brand request sent). */
export function track(name: string) {
  if (typeof location === "undefined" || location.pathname.startsWith("/admin") || location.pathname.startsWith("/team")) return;
  send("click", location.pathname, name);
}

/** utm_source / utm_medium / utm_campaign from the first page of this tab, kept for the whole visit. */
function utm() {
  try {
    const have = sessionStorage.getItem("sb-utm");
    if (have !== null) return "";
    const q = new URLSearchParams(location.search);
    const v = ["utm_source", "utm_medium", "utm_campaign"].map((k) => (q.get(k) || "").slice(0, 40)).join("|");
    sessionStorage.setItem("sb-utm", v);
    return v === "||" ? "" : v;
  } catch { return ""; }
}

/** Counts page views and button/link clicks for the admin funnel. Skips the admin and team pages. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/admin") || path.startsWith("/team")) return;
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? new URL(document.referrer).hostname : "";
    send("view", path, "", ref, utm());
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
