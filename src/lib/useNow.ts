"use client";
import { useEffect, useState } from "react";
/** Current time, ticking every `ms`. Null on the server/first render to avoid hydration mismatch. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
