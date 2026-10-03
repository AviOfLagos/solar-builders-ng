"use client";
import { useEffect } from "react";
import { setRef } from "@/lib/client";

/** Picks up ?ref=slug from any link and remembers it for checkout. */
export function RefCapture({ slug }: { slug?: string }) {
  useEffect(() => {
    const r = slug || new URLSearchParams(location.search).get("ref");
    if (r && /^[a-z0-9-]{3,30}$/.test(r)) setRef(r);
  }, [slug]);
  return null;
}
