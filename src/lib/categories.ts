/** Product categories. Kept apart from the catalog so menus can use them without shipping every product. */
export const CATEGORIES = [
  { slug: "complete-systems", name: "Complete solar systems", short: "Complete systems", blurb: "Inverter, battery and panels sized to work together. The easiest way to go solar." },
  { slug: "inverters", name: "Inverters", short: "Inverters", blurb: "Hybrid and pure sine wave inverters from 2kW to 50kW." },
  { slug: "batteries", name: "Lithium batteries", short: "Batteries", blurb: "LiFePO4 storage that lasts thousands of cycles. Keep power through the night." },
  { slug: "power-stations", name: "Portable power stations", short: "Power stations", blurb: "Silent, plug-and-play backup. No installation, no fuel." },
  { slug: "solar-panels", name: "Solar panels", short: "Panels", blurb: "Monocrystalline and bifacial panels to charge your system for free." },
  { slug: "lights-accessories", name: "Lights, fans & accessories", short: "Lights & more", blurb: "Solar lanterns, fans, street lights and charge controllers." },
] as const;
