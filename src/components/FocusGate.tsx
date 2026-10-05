"use client";
import { usePathname } from "next/navigation";

const FOCUSED = ["/find", "/start", "/checkout", "/kit", "/fund/new"];

/** Hides site chrome (promo bar, footer) on app-like step-by-step flows. */
export function FocusGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const focused = FOCUSED.some((p) => path === p || path.startsWith(p + "/")) && !path.startsWith("/checkout/success");
  return focused ? null : <>{children}</>;
}
