"use client";
import { naira } from "@/lib/format";
import { compareAt, inPromo, promoState } from "@/lib/promo";
import { PROMO } from "@/config/store";
import { useNow } from "@/lib/useNow";

export function PriceTag({ price, slug, category, size = "md" }: { price: number; slug: string; category: string; size?: "md" | "lg" }) {
  const now = useNow(30_000);
  const promo = now && inPromo({ slug, category }) && promoState(now).active;
  const big = size === "lg";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-display num font-semibold ${big ? "text-4xl" : "text-lg"}`}>{naira(price)}</span>
      {promo && (
        <>
          <s className={`num text-mute ${big ? "text-lg" : "text-sm"}`}>{naira(compareAt(price))}</s>
          <span className={`rounded-full bg-flare px-2 py-0.5 font-semibold text-white ${big ? "text-sm" : "text-xs"}`}>{PROMO.percent}% off</span>
        </>
      )}
    </div>
  );
}
