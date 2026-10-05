// Business rules live here so they can be changed without touching UI code.
import pricing from "./pricing.json";

export const STORE = {
  name: "Solar Builders NG",
  shortName: "Solar Builders",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://solar-ng.vercel.app",
  city: "Lagos",
  country: "NG",
  /** Empty until we have a domain with a real inbox. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+2347030546907",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "2347030546907",
  currency: "NGN",
  /** Markup on the official brand price (0.125 = 12.5%), per-brand overrides (a partner at +30% = 0.3) and rounding. Edit pricing.json. */
  markup: pricing.markup,
  brandMarkup: pricing.brandMarkup as Record<string, number>,
  roundTo: pricing.roundTo,
  /** Delivery fee within Lagos (naira). 0 = free. */
  deliveryFee: 0,
  /** Social profiles. Empty ones are hidden. */
  socials: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "",
    x: process.env.NEXT_PUBLIC_X || "",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK || "",
    facebook: process.env.NEXT_PUBLIC_FACEBOOK || "",
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN || "",
  },
};

/**
 * Pay small small: a partner lender pays us in full; the customer repays the lender.
 * Rates are set by the lender, so we only show the split, not interest.
 */
export const FINANCE = {
  minTotal: 300_000,
  downPayments: [30, 40, 50],
  months: [3, 6, 12],
  employment: ["Salaried", "Self-employed / business owner", "Freelancer / remote worker", "Student", "Other"],
  incomeBands: ["Under ₦200k", "₦200k – ₦500k", "₦500k – ₦1m", "₦1m – ₦3m", "Above ₦3m"],
};
/** Cart limits, the same on the phone, in the browser and on the server. */
export const CART = {
  maxQty: 50,
  maxLines: 40,
  /** Above this, orders go through WhatsApp. Also keeps totals well inside database limits. */
  maxTotal: 100_000_000,
};

/** Order statuses, in order, with the words customers see. */
export const ORDER_STATUS = {
  awaiting_payment: "Waiting for payment",
  pending: "Pending: we'll call to confirm",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  installed: "Installed: lights on",
  cancelled: "Cancelled",
  expired: "Payment not completed",
  refunded: "Refunded",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;
/** Statuses the team can move a paid order through. */
export const FULFILMENT: OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered", "installed"];

/** Go Solar Me pools. */
export const POOL = {
  deadlineDays: [14, 30, 60],
  defaultDays: 30,
  /** After the deadline, the owner has this long to choose before supporters are refunded. */
  choiceDays: 7,
  extendDays: 30,
  squadMin: 2,
  squadMax: 10,
  chipIns: [5_000, 10_000, 20_000],
};

export const OCCASIONS = [
  { slug: "birthday", label: "Birthday", story: (n: string) => `${n}'s birthday is coming, and we want to give something that lasts: steady light, no generator noise and no more fuel money. Every naira here goes straight to ${n}'s solar kit.` },
  { slug: "mothers-day", label: "Mother's Day", story: (n: string) => `${n} has kept the house running through every NEPA outage. This Mother's Day, let's give her steady light and a quiet night's sleep. Every naira goes straight to her solar kit.` },
  { slug: "christmas", label: "Christmas", story: (n: string) => `This Christmas, let's give ${n} light that doesn't depend on NEPA or fuel queues. Every naira goes straight to the solar kit.` },
  { slug: "new-baby", label: "New baby", story: (n: string) => `A new baby means night feeds, a fan that must stay on and a fridge that can't go off. Help ${n} go solar so the little one never sleeps in the heat.` },
  { slug: "nepa", label: "NEPA wahala", story: (n: string) => `${n} is tired of buying fuel and sleeping in the heat. Together we can switch ${n} to solar for good. Every naira goes straight to the kit.` },
  { slug: "just-because", label: "Just because", story: (n: string) => `Help ${n} go solar. Every naira here goes straight to the solar kit, and we deliver and install it in Lagos.` },
] as const;
export type Occasion = (typeof OCCASIONS)[number]["slug"];

export const LAGOS_LGAS = [
  "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry",
  "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe",
  "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere",
] as const;

/**
 * Timed promo. The discount is presentational: the struck-through "was" price is
 * derived from the normal selling price so that after the discount the customer
 * pays exactly the normal selling price (official price + markup).
 */
export const PROMO = {
  name: "Solar Friday",
  percent: 15,
  /** 0 = Sunday … 5 = Friday, in Africa/Lagos time. */
  weekdays: [5],
  timeZone: "Africa/Lagos",
  /** Which products show the promo. Empty arrays = all products. */
  categories: ["power-stations", "batteries", "solar-panels", "lights-accessories", "inverters"] as string[],
  productSlugs: [] as string[],
};
