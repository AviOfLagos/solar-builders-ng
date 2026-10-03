import { PROMO, STORE } from "@/config/store";
import type { Product } from "./catalog";

function lagosParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: PROMO.timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const secs = (+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second;
  return { day, secs };
}

const forced = () => process.env.NEXT_PUBLIC_PROMO_PREVIEW === "1";

export function promoState(now = new Date()) {
  const { day, secs } = lagosParts(now);
  const active = forced() || PROMO.weekdays.includes(day);
  if (active) {
    return { active: true as const, msLeft: (86400 - secs) * 1000 };
  }
  let daysAhead = 1;
  while (!PROMO.weekdays.includes((day + daysAhead) % 7) && daysAhead < 8) daysAhead++;
  const startsIn = daysAhead * 86400 - secs;
  return { active: false as const, msLeft: startsIn * 1000 };
}

export function inPromo(p: Pick<Product, "slug" | "category">) {
  if (PROMO.productSlugs.length && PROMO.productSlugs.includes(p.slug)) return true;
  if (!PROMO.categories.length && !PROMO.productSlugs.length) return true;
  return PROMO.categories.includes(p.category);
}

/** The display-only "was" price, so that (was − percent) = selling price. */
export function compareAt(price: number) {
  const was = price / (1 - PROMO.percent / 100);
  return Math.ceil(was / (STORE.roundTo * 10)) * STORE.roundTo * 10;
}

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
