// Business rules live here so they can be changed without touching UI code.

export const STORE = {
  name: "Solar Builders NG",
  shortName: "Solar Builders",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://solar-builders-ng.vercel.app",
  city: "Lagos",
  country: "NG",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@solarbuilders.ng",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+2348000000000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000",
  currency: "NGN",
  /** Markup on the official brand price. 0.01 = 1%. */
  markup: 0.01,
  /** Round selling prices up to the nearest N naira. */
  roundTo: 10,
  /** Delivery fee within Lagos (naira). 0 = free. */
  deliveryFee: 0,
};

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
