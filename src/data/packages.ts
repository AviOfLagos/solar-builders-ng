import { getProduct, type Product } from "@/lib/catalog";

/**
 * Ready-made kits per buyer type. Items are real catalog products, so the kit
 * price is always the sum of live product prices. `install` is the typical
 * Lagos installation range (labour, cables, breakers, surge protection,
 * mounting) — shown as an estimate, never charged at checkout.
 */
export type Tier = {
  id: string;
  name: string;
  tagline: string;
  powers: string[];
  items: { slug: string; qty: number }[];
  kw: number;
  kwh: number;
  install: [number, number];
  best?: boolean;
};

export type Segment = {
  slug: string;
  name: string;
  short: string;
  who: string;
  worry: string;
  seoTitle: string;
  seoDescription: string;
  tiers: Tier[];
};

export const SEGMENTS: Segment[] = [
  {
    slug: "students",
    name: "Students & corps members",
    short: "Students",
    who: "Hostel, lodge or PPA room. You need light to read, a charged phone and a fan that doesn't need fuel.",
    worry: "“I can't afford a generator and NEPA is never there during exams.”",
    seoTitle: "Solar for students & corps members in Lagos — kits from ₦86k",
    seoDescription: "Affordable solar kits for hostels and PPA rooms in Lagos: lights, phone charging, laptop and fan. No installation needed. Free Lagos delivery.",
    tiers: [
      { id: "hostel-light", name: "Hostel Light", tagline: "Light and phone charging, nothing to install", powers: ["4 LED lights", "Phone charging"], items: [{ slug: "sun-king-homeplus-pro", qty: 1 }], kw: 0.01, kwh: 0.04, install: [0, 0] },
      { id: "hostel-plus", name: "Hostel Plus", tagline: "Bright room, laptop charging and a solar fan", powers: ["4 bright tubes", "Laptop via USB-C", "Solar fan up to 20h", "Phones"], items: [{ slug: "sun-king-homeplus-max", qty: 1 }, { slug: "sun-king-16-solar-table-fan", qty: 1 }], kw: 0.07, kwh: 0.2, install: [0, 0], best: true },
      { id: "room-power", name: "Room Power", tagline: "Real sockets: laptop, Wi-Fi, fan, ring light", powers: ["Laptop", "Wi-Fi router", "Standing fan", "Phones"], items: [{ slug: "ecoflow-river-3-ups-solar-generator-110w-portable-solar-panel", qty: 1 }], kw: 0.6, kwh: 0.29, install: [0, 0] },
    ],
  },
  {
    slug: "remote-workers",
    name: "Tech bros & remote workers",
    short: "Tech bros",
    who: "Calls with clients abroad, deploys at 2am, deadlines that don't care about NEPA.",
    worry: "“I spend more on petrol than on rent, and my laptop still dies mid-call.”",
    seoTitle: "Solar for remote workers & tech bros in Lagos — never drop a call",
    seoDescription: "Silent solar setups for remote workers in Lagos: laptop, monitors, Wi-Fi and fan all day. Three packages from ₦381k. Free Lagos delivery.",
    tiers: [
      { id: "never-drop-a-call", name: "Never Drop a Call", tagline: "Laptop + Wi-Fi through any outage. Switches over in under 10ms", powers: ["Laptop", "Wi-Fi router", "Phone", "Desk lamp"], items: [{ slug: "ecoflow-river-3-ups-solar-generator-110w-portable-solar-panel", qty: 1 }], kw: 0.6, kwh: 0.29, install: [0, 0] },
      { id: "work-from-home", name: "Work From Home", tagline: "A full workday off-grid: monitors, fan, ring light", powers: ["Laptop + 2 monitors", "Wi-Fi", "Standing fan", "Ring light", "Phone"], items: [{ slug: "ecoflow-delta-3-classic-solar-generator", qty: 1 }], kw: 1.8, kwh: 1.02, install: [0, 0], best: true },
      { id: "home-office-pro", name: "Home Office Pro", tagline: "Your whole flat stays on: fridge, TV, fans and your setup", powers: ["Workstation", "Fridge", "TV", "Fans", "Lights"], items: [{ slug: "itel-powercore-3k-pro-3kw-24v-ip54-smart-inverter-2-56kwh-lithium-batt", qty: 1 }], kw: 3, kwh: 2.56, install: [120_000, 250_000] },
    ],
  },
  {
    slug: "renters",
    name: "Renters (no landlord wahala)",
    short: "Renters",
    who: "You can't drill the roof or rewire the flat, and you'll move in a year or two.",
    worry: "“My landlord won't let me install anything, and I don't want to leave it behind when I move.”",
    seoTitle: "Portable solar for renters in Lagos — no installation, take it when you move",
    seoDescription: "Plug-and-play solar generators for renters in Lagos. No drilling, no wiring, no landlord permission. Power fridge, TV and fans. Free delivery.",
    tiers: [
      { id: "renter-starter", name: "Room Starter", tagline: "Lights, TV, fans and laptop. Panel goes by the window", powers: ["TV", "2 fans", "Lights", "Laptop"], items: [{ slug: "ecoflow-delta-3-1000-air", qty: 1 }, { slug: "ecoflow-nextgen-220w-monofacial-portable-solar-panel", qty: 1 }], kw: 0.5, kwh: 0.96, install: [0, 0] },
      { id: "renter-flat", name: "Whole Flat", tagline: "Runs the fridge too. Recharges from 2 panels in a day", powers: ["Fridge", "TV", "Fans", "Lights", "Laptops"], items: [{ slug: "ecoflow-delta-3-max-portable-power-station", qty: 1 }, { slug: "ecoflow-nextgen-220w-monofacial-portable-solar-panel", qty: 2 }], kw: 2.4, kwh: 2.05, install: [0, 0], best: true },
      { id: "renter-max", name: "Big Flat", tagline: "4kW output for freezer, microwave and more", powers: ["Freezer", "Fridge", "Microwave", "TV", "Fans"], items: [{ slug: "ecoflow-delta-pro-3-portable-power-station", qty: 1 }, { slug: "ecoflow-nextgen-220w-monofacial-portable-solar-panel", qty: 2 }], kw: 4, kwh: 4, install: [0, 0] },
    ],
  },
  {
    slug: "shops",
    name: "Shops, POS, barbers & salons",
    short: "Shops & POS",
    who: "Every hour the shop is dark is money gone, and petrol eats the profit.",
    worry: "“I'm working for the petrol station.”",
    seoTitle: "Solar for shops, POS, barbers & salons in Lagos — pays back in months",
    seoDescription: "Solar kits for Lagos shops, POS agents, barbers and salons. Run clippers, POS, fans and a freezer without petrol. Free Lagos delivery.",
    tiers: [
      { id: "shop-starter", name: "Kiosk & POS", tagline: "POS, phones, lights and a fan. Plug and play", powers: ["POS terminal", "Phone charging", "Lights", "Fan", "Clippers"], items: [{ slug: "sun-king-powerplay-pro", qty: 1 }], kw: 0.6, kwh: 0.8, install: [0, 50_000] },
      { id: "shop-pro", name: "Shop Pro", tagline: "Freezer, dryer, clippers, TV — 3kW with panels included", powers: ["Freezer", "Hair dryer", "Clippers", "TV", "Fans", "Lights"], items: [{ slug: "itel-powercore-3k-pro-3kw-24v-ip54-smart-inverter-2-56kwh-lithium-batt", qty: 1 }], kw: 3, kwh: 2.56, install: [120_000, 250_000], best: true },
    ],
  },
  {
    slug: "families",
    name: "Families in flats",
    short: "Family flats",
    who: "2–3 bedroom flat with a fridge, freezer, TV, fans and a pumping machine.",
    worry: "“We paid for a 1.5kVA and it can't even carry the freezer.”",
    seoTitle: "Solar for 2–3 bedroom flats in Lagos — complete kits & installation cost",
    seoDescription: "Complete solar systems for Lagos family flats: fridge, freezer, TV, fans and pumping machine. Typical installed cost shown upfront.",
    tiers: [
      { id: "flat-essential", name: "Flat Essential", tagline: "3kVA + 5kWh lithium + 4 panels. Fridge, TV, fans overnight", powers: ["Fridge", "TV", "Fans", "Lights", "Laptops"], items: [{ slug: "felicity-ivem3048-lv-3kva-hybrid-inverter-48v-low-voltage", qty: 1 }, { slug: "felicity-flh-48100ug1-48v-100ah-lifepo4-battery-module-5-12kwh", qty: 1 }, { slug: "felicity-solar-550w-monocrystalline-solar-panel", qty: 4 }], kw: 3, kwh: 5.12, install: [200_000, 400_000] },
      { id: "flat-comfort", name: "Flat Comfort", tagline: "4kW + 10kWh + 8 panels. Add the freezer and pumping machine", powers: ["Freezer", "Fridge", "Pumping machine", "TV", "Fans"], items: [{ slug: "itel-energy-complete-4kw-hybrid-solar-system-2x-5kwh-lithium-battery-8", qty: 1 }], kw: 4, kwh: 10, install: [250_000, 450_000], best: true },
      { id: "flat-ac", name: "Flat + AC", tagline: "6kVA + 10kWh + 8 panels. Runs one inverter AC", powers: ["1 inverter AC", "Freezer", "Fridge", "Pumping machine", "TV"], items: [{ slug: "felicity-ivem6048-6kva-hybrid-inverter-48v", qty: 1 }, { slug: "felicity-flh-48100ug1-48v-100ah-lifepo4-battery-module-5-12kwh", qty: 2 }, { slug: "felicity-solar-550w-monocrystalline-solar-panel", qty: 8 }], kw: 6, kwh: 10.24, install: [300_000, 500_000] },
    ],
  },
  {
    slug: "duplex",
    name: "Duplexes & big homes",
    short: "Duplex",
    who: "Several ACs, a borehole pump and a family that expects 24/7 power.",
    worry: "“I want to switch off the generator completely, not just at night.”",
    seoTitle: "Solar for duplexes in Lagos — 6kW to 10kW systems with ACs",
    seoDescription: "Whole-home solar for Lagos duplexes: multiple ACs, borehole pump and 24/7 power. 6–10kW systems with typical installed cost shown.",
    tiers: [
      { id: "duplex", name: "Duplex", tagline: "6kW + 16kWh + 12 panels. Two inverter ACs, borehole pump", powers: ["2 inverter ACs", "Borehole pump", "Freezer", "Fridges", "TVs"], items: [{ slug: "itel-energy-complete-6kw-hybrid-solar-system-16kwh-lithium-lifepo4-bat", qty: 1 }], kw: 6, kwh: 16, install: [350_000, 600_000], best: true },
      { id: "duplex-max", name: "Duplex Max", tagline: "10kW Arnergy + 10kWh (expandable to 30) + 16 panels", powers: ["3+ ACs", "Borehole pump", "Everything else"], items: [{ slug: "arnergy-10kw-inverter-with-scalable-10kwh-to-30kwh-lfp-battery-storage", qty: 1 }, { slug: "arnergy-350w-monocrystalline-solar-panel", qty: 16 }], kw: 10, kwh: 10, install: [600_000, 1_200_000] },
    ],
  },
  {
    slug: "offices",
    name: "Offices, churches & schools",
    short: "Offices",
    who: "Staff, computers, projectors and ACs during working hours, without the diesel bill.",
    worry: "“Diesel costs more than our salaries some months.”",
    seoTitle: "Solar for offices, churches & schools in Lagos — 5kW to 15kW",
    seoDescription: "Commercial solar for Lagos offices, churches and schools. Arnergy 5–15kW systems with scalable lithium storage. Site survey available.",
    tiers: [
      { id: "office-small", name: "Small Office", tagline: "5kW + 5kWh (expandable) + 12 panels. Up to ~10 staff", powers: ["Computers", "Wi-Fi", "Printer", "Lights", "1 inverter AC"], items: [{ slug: "arnergy-5kw-inverter-with-scalable-5kwh-to-15kwh-lfp-battery-storage", qty: 1 }, { slug: "arnergy-350w-monocrystalline-solar-panel", qty: 12 }], kw: 5, kwh: 5, install: [400_000, 800_000], best: true },
      { id: "office-pro", name: "Office Pro", tagline: "15kW + 15kWh (expandable to 45) + 30 panels", powers: ["Several ACs", "Projectors", "Sound system", "Computers"], items: [{ slug: "arnergy-15kw-inverter-with-scalable-15kwh-to-45kwh-lfp-battery-storage", qty: 1 }, { slug: "arnergy-350w-monocrystalline-solar-panel", qty: 30 }], kw: 15, kwh: 15, install: [800_000, 1_500_000] },
    ],
  },
];

export type ResolvedTier = Tier & { segment: Segment; lines: { p: Product; qty: number }[]; price: number };

export function resolveTier(segment: Segment, t: Tier): ResolvedTier {
  const lines = t.items.map((i) => {
    const p = getProduct(i.slug);
    if (!p) throw new Error(`Package ${t.id} references missing product ${i.slug}`);
    return { p, qty: i.qty };
  });
  return { ...t, segment, lines, price: lines.reduce((s, l) => s + l.p.price * l.qty, 0) };
}

export const ALL_TIERS: ResolvedTier[] = SEGMENTS.flatMap((s) => s.tiers.map((t) => resolveTier(s, t)));
export const getSegment = (slug: string) => SEGMENTS.find((s) => s.slug === slug);
export const tiersFor = (s: Segment) => ALL_TIERS.filter((t) => t.segment.slug === s.slug);

/** Cheapest kits that cover the load; kits for the chosen buyer type come first. */
export function recommend(kw: number, kwh: number, n = 3, segment?: string) {
  return ALL_TIERS.filter((t) => t.kw >= kw && t.kwh >= kwh * 0.85)
    .sort((a, b) => Number(b.segment.slug === segment) - Number(a.segment.slug === segment) || a.price - b.price)
    .filter((t, i, arr) => arr.findIndex((x) => x.items.map((y) => y.slug).join() === t.items.map((y) => y.slug).join()) === i)
    .slice(0, n);
}
