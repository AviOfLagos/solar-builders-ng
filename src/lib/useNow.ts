"use client";
import { useSyncExternalStore } from "react";

/** Current time, ticking every `ms`. Null on the server and during hydration, so server and browser HTML match. */
export function useNow(ms = 1000) {
  const t = useSyncExternalStore(
    (cb) => { const id = setInterval(cb, ms); return () => clearInterval(id); },
    () => Math.floor(Date.now() / ms) * ms,
    () => null,
  );
  return t === null ? null : new Date(t);
}
