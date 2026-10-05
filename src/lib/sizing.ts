/** Sizing: what to buy for what someone wants to run. Same rule as the app and the power planner. */
export const APPLIANCES = [
  { key: "bulb", label: "LED bulbs", w: 10, duty: 1 },
  { key: "fan", label: "Fans", w: 70, duty: 1 },
  { key: "laptop", label: "Laptops", w: 65, duty: 1 },
  { key: "monitor", label: "Monitors", w: 30, duty: 1 },
  { key: "router", label: "Wi-Fi router", w: 15, duty: 1 },
  { key: "tv", label: "TV + decoder", w: 120, duty: 1 },
  { key: "fridge", label: "Fridge", w: 150, duty: 0.45, surge: 3 },
  { key: "freezer", label: "Chest freezer", w: 200, duty: 0.5, surge: 3 },
  { key: "pump", label: "Water pump", w: 750, duty: 0.08, surge: 3 },
  { key: "ac", label: "AC (1HP)", w: 900, duty: 0.7, surge: 1.5 },
  { key: "clipper", label: "POS / clippers", w: 30, duty: 1 },
  { key: "dryer", label: "Hair dryer", w: 1200, duty: 0.15 },
] as const;
export type ApplianceKey = (typeof APPLIANCES)[number]["key"];
export type Load = Record<ApplianceKey, number>;
export const emptyLoad = Object.fromEntries(APPLIANCES.map((a) => [a.key, 0])) as Load;

export const PRESETS: Record<string, { load: Partial<Load>; hours: number }> = {
  students: { load: { bulb: 2, fan: 1, laptop: 1 }, hours: 6 },
  "remote-workers": { load: { bulb: 2, fan: 1, laptop: 1, monitor: 2, router: 1 }, hours: 8 },
  renters: { load: { bulb: 4, fan: 2, tv: 1, fridge: 1, laptop: 1 }, hours: 8 },
  shops: { load: { bulb: 3, fan: 1, clipper: 2, tv: 1, freezer: 1 }, hours: 10 },
  families: { load: { bulb: 8, fan: 3, tv: 1, fridge: 1, freezer: 1, pump: 1, laptop: 1 }, hours: 10 },
  duplex: { load: { bulb: 14, fan: 4, tv: 2, fridge: 1, freezer: 1, pump: 1, ac: 2, router: 1, laptop: 2 }, hours: 12 },
  offices: { load: { bulb: 10, fan: 4, laptop: 8, monitor: 6, router: 1, ac: 1 }, hours: 9 },
};

export function sizeLoad(load: Partial<Load>, hours: number) {
  let running = 0, energy = 0, surge = 0;
  for (const a of APPLIANCES) {
    const n = load[a.key] ?? 0;
    running += a.w * n;
    energy += a.w * n * a.duty * hours;
    surge = Math.max(surge, n ? a.w * (("surge" in a ? a.surge : 1) - 1) : 0);
  }
  return {
    running,
    kw: Math.max(0.1, Math.round(((running + surge) * 1.25) / 100) / 10),
    kwh: Math.max(0.05, Math.round((energy / 1000 / 0.8) * 10) / 10),
  };
}

/** Rough monthly fuel spend for a small generator covering the same hours. */
export function fuelPerMonth(kw: number, hoursPerDay: number, pricePerLitre = 1000) {
  const litresPerHour = Math.max(0.4, kw * 0.35);
  return Math.round((litresPerHour * hoursPerDay * 30 * pricePerLitre) / 1000) * 1000;
}

/** "id:qty,id:qty" for kit links. */
export const encodeItems = (items: { id: string; qty: number }[]) => items.map((i) => `${i.id}:${i.qty}`).join(",");
export const decodeItems = (s: string | null | undefined) =>
  (s ?? "").split(",").map((x) => x.split(":")).filter(([id, q]) => id && Number(q) > 0).map(([id, q]) => ({ id, qty: Math.min(50, Math.floor(Number(q))) }));
