"use client";
import Link from "next/link";
import { PROMO } from "@/config/store";
import { fmtDuration, promoState } from "@/lib/promo";
import { useNow } from "@/lib/useNow";

export function PromoBar() {
  const now = useNow(1000);
  const st = now ? promoState(now) : null;
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-sm">
        {st?.active ? (
          <>
            <span className="font-semibold text-sun">{PROMO.name} is live: {PROMO.percent}% off batteries, inverters, panels and more.</span>
            <span className="num rounded bg-white/10 px-2 py-0.5">Ends in {fmtDuration(st.msLeft)}</span>
            <Link href="/deals" className="hidden underline underline-offset-4 sm:inline">Shop deals</Link>
          </>
        ) : (
          <>
            <span>Free delivery anywhere in Lagos. Optional installer on request.</span>
            {st && <span className="num hidden text-sun sm:inline">{PROMO.name} starts in {fmtDuration(st.msLeft)}</span>}
          </>
        )}
      </div>
    </div>
  );
}
