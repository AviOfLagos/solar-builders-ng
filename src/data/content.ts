export const FAQ = [
  {
    q: "Do you deliver outside Lagos?",
    a: "Not yet. We deliver to all 20 Lagos LGAs, from Ikorodu and Epe to Badagry, Lekki and Ikeja. Delivery within Lagos is free.",
  },
  {
    q: "Are your products genuine?",
    a: "Yes. We only sell five brands — Felicity Solar, itel Energy, Sun King, Arnergy and EcoFlow — and we order every item from the brand's official Nigerian store or authorised distributor. The manufacturer's warranty applies.",
  },
  {
    q: "Can you install the system for me?",
    a: "Yes. Tick “I need an installer” at checkout and we'll connect you with one of our engineers after your order. Installation is quoted and paid separately, so you only pay for products at checkout.",
  },
  {
    q: "What happens after I pay?",
    a: "Your order is marked pending and you get an email right away. We then call you on the number you gave to confirm the items, delivery time and, if you asked, installation.",
  },
  {
    q: "What size inverter do I need for a 3-bedroom flat in Lagos?",
    a: "For lights, fans, TV, a fridge and laptops, a 3–5kW hybrid inverter with 5–10kWh of lithium storage covers most 3-bedroom homes overnight. Adding an air conditioner usually means 5kW or more. Use the planner on our homepage to size it for your appliances.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "Pay in naira with a Nigerian card (Verve, Visa, Mastercard), a bank transfer or USSD, through Paystack. Paying from abroad? Use any Visa, Mastercard or Amex card, through Stripe. Signed in, you can save cards, give each one a name, and pick it at checkout next time.",
  },
  {
    q: "When is Solar Friday?",
    a: "Every Friday (Lagos time) we run Solar Friday deals on selected batteries, inverters, panels and power stations. Join the mailing list to get a reminder.",
  },
];

export type Guide = {
  slug: string; title: string; description: string; keyword?: string; updated?: string;
  sections: { h: string; p: string[]; table?: { head: string[]; rows: string[][] } }[];
  links: { label: string; href: string }[];
  sources?: { label: string; href: string }[];
};

/** The fears that stop people buying, answered in one line each. */
export const WORRIES = [
  { q: "“Will it carry my AC?”", a: "Only if it's sized for it. A regular AC pulls 3–5× its power when it starts, so you need 6kVA+ or an inverter AC. Our calculator accounts for start-up surge.", href: "/guides/can-solar-carry-ac-pumping-machine" },
  { q: "“My last battery died in 2 years.”", a: "That's usually tubular lead-acid used every night. Every battery we sell is LiFePO4 lithium with a built-in BMS, rated for 6,000+ cycles.", href: "/guides/lithium-vs-tubular-battery-nigeria" },
  { q: "“How do I know it's not fake?”", a: "We only sell five brands and order each item from the brand's official Nigerian store. Manufacturer warranty applies. No home-made battery packs.", href: "/guides/how-to-spot-fake-solar-battery" },
  { q: "“It stops working in rainy season.”", a: "Output drops 15–30% when it's cloudy and panels are dirty. We size panels with headroom and show you how to clean them every 3–4 weeks.", href: "/guides/solar-rainy-season-nigeria" },
  { q: "“I'm renting. My landlord won't allow it.”", a: "Portable solar generators need no drilling or wiring. The panel sits by a window and you take everything when you move.", href: "/packages/renters" },
  { q: "“Who installs it? I don't trust random installers.”", a: "Tick “I need an installer” at checkout. One of our engineers installs with proper breakers, surge protection and earthing.", href: "/faq" },
];

export const GUIDES: Guide[] = [
  {
    slug: "solar-installation-cost-lagos",
    title: "Solar installation cost in Lagos (2026): what each type of home actually pays",
    description: "Real kit prices plus typical installation cost in Lagos for students, renters, remote workers, shops, family flats, duplexes and offices.",
    keyword: "cost of solar installation in Lagos",
    updated: "October 2026",
    sections: [
      { h: "The short answer", p: ["Across Lagos in 2026, a basic 1–1.5kVA system installed costs roughly ₦0.85M–₦1.8M, a 3–3.5kVA system ₦2M–₦3.4M, a 5kVA system with lithium ₦3.6M–₦5.7M and a 10kVA system ₦7.9M–₦12.3M. Prices move with the naira, so treat these as ranges.", "Below are our own ready-made kits with their live prices and what installation typically adds on top."] },
      { h: "What installation includes", p: ["Installation is more than labour. A proper job includes the panel rack, DC and AC cables, breakers, a surge protection device (SPD), earthing and transport. For a 5kVA home system this usually adds ₦120k–₦500k; a recent itemised 6.2kVA quote came to ₦485k.", "If an installer quotes far below this, ask what they're leaving out. Missing surge protection and undersized cables are the most common causes of solar fires."] },
      { h: "Where the money goes", p: ["On a typical home system, the battery is 35–45% of the cost, panels 25–30% and the inverter 20–25%. That's why lithium battery size is the biggest lever on price."] },
    ],
    links: [{ label: "See all packages", href: "/packages" }, { label: "Size your system", href: "/#planner" }],
    sources: [
      { label: "PVPRO — Cost of solar installation in Nigeria 2026", href: "https://pvpro.com.ng/cost-of-solar-installation-in-nigeria-2026/" },
      { label: "PVPRO — Solar equipment prices Lagos, Sep 2026", href: "https://pvpro.com.ng/solar-equipment-prices-lagos-september-2026/" },
      { label: "Solar Valley — 6.2kVA installation quote breakdown", href: "https://solarvalleyltd.com/blog/full-cost-breakdown-of-a-6-2kva-6kva-solar-installation-quote-in-nigeria" },
      { label: "SolarDecide — 5kVA system cost Nigeria 2026", href: "https://solardecide.com/blog/5kva-solar-system-cost-nigeria-2026/" },
    ],
  },
  {
    slug: "can-solar-carry-ac-pumping-machine",
    title: "Can solar carry my AC or pumping machine?",
    description: "Why a 5kVA inverter often trips on an air conditioner or pumping machine, and what size you really need.",
    keyword: "solar for air conditioner Nigeria",
    sections: [
      { h: "It's the start-up surge", p: ["Motors — in ACs, fridges, freezers and pumping machines — pull 3–5 times their running power for a second when they start. A 1HP pump that runs at 750W can demand over 2,000W at start-up. If the inverter can't supply that surge, it trips."] },
      { h: "What size you need", p: ["One inverter AC (1–1.5HP) with the rest of a flat: about a 6kVA inverter, 10kWh+ of lithium and 3.5–5kW of panels.", "A pumping machine on its own is fine on a 3kVA+ inverter if nothing else heavy starts at the same time. Run it in the afternoon when the sun is charging the battery.", "Regular (non-inverter) ACs are much harder on solar. If you're buying a new AC, get an inverter model."] },
    ],
    links: [{ label: "Flat + AC package", href: "/packages/families#flat-ac" }, { label: "Duplex packages", href: "/packages/duplex" }],
    sources: [{ label: "Kinbu Power — Solar system for air conditioner in Nigeria", href: "https://www.kinbupower.com/blog/solar-system-for-air-conditioner-nigeria" }],
  },
  {
    slug: "solar-rainy-season-nigeria",
    title: "Why solar drops in rainy season (and how to keep it working)",
    description: "Cloud cover and dirty panels cut output 15–30% in Lagos rainy season. Here's how to size for it and keep your system healthy.",
    keyword: "solar rainy season Nigeria",
    sections: [
      { h: "Rain doesn't clean your panels", p: ["Rain leaves dust and mineral marks behind. Combined with cloud cover, Lagos systems commonly lose 15–30% of output between May and October. Wipe panels with clean water and a soft cloth every 3–4 weeks."] },
      { h: "Size with headroom", p: ["If your system only just recharges in December, it won't in July. We size panels with extra capacity so the battery still fills on cloudy days. Lithium batteries also help: they charge faster and accept partial charges without damage."] },
    ],
    links: [{ label: "Solar panels", href: "/category/solar-panels" }],
    sources: [{ label: "BusinessDay — Why solar panels underperform every rainy season", href: "https://businessday.ng/energy/article/why-solar-panels-in-nigeria-underperform-every-rainy-season/" }],
  },
  {
    slug: "how-to-spot-fake-solar-battery",
    title: "How to avoid fake solar batteries and bad installations",
    description: "Counterfeit panels, home-made lithium packs without a BMS and unqualified installers are causing fires in Nigeria. How to protect yourself.",
    keyword: "solar scams in Nigeria",
    sections: [
      { h: "The warning signs", p: ["A lithium battery far cheaper than the brand's own price. No brand name, serial number or datasheet. A pack that's been assembled locally with visible wires and no battery management system (BMS). An installer who won't itemise breakers, surge protection and cable sizes."] },
      { h: "How to buy safely", p: ["Buy known brands from official channels, keep the receipt and serial number, and insist on surge protection, correctly sized cables and earthing. Every product we sell comes from the brand's official Nigerian store or authorised distributor."] },
    ],
    links: [{ label: "Lithium batteries", href: "/category/batteries" }, { label: "Our brands", href: "/shop" }],
    sources: [
      { label: "Sahara Reporters — Substandard solar products and installers", href: "https://saharareporters.com/2025/08/13/expert-warns-nigerians-potential-fire-disaster-substandard-solar-products-installers" },
      { label: "BusinessDay — Solar boom draws safety warnings", href: "https://businessday.ng/energy/article/nigerias-solar-boom-draws-safety-warnings-as-installations-outpace-oversight/" },
    ],
  },
  {
    slug: "what-size-inverter-do-i-need-lagos",
    title: "What size inverter and battery do I need in Lagos?",
    description: "A simple way to size a solar inverter and lithium battery for your Lagos home or shop, with worked examples for 1, 2 and 3-bedroom homes.",
    sections: [
      { h: "Start with what you want to run", p: ["List the appliances you want on during an outage and their wattage. LED bulbs use about 10W, a standing fan 60–75W, a TV with decoder about 120W, a fridge 100–200W and a 1HP air conditioner about 900W.", "Add up the watts of everything that can run at the same time. That number, plus about 25% headroom, is the minimum inverter size. Fridges, pumps and ACs draw extra power when they start, so allow more if you have them."] },
      { h: "Then decide how many hours of backup", p: ["Battery size is energy, not power: watts × hours. Ten LED bulbs, two fans, a TV and a fridge running for 8 hours is roughly 2.5–3kWh.", "Lithium (LiFePO4) batteries can safely use about 80–90% of their capacity, so divide by 0.8 to get the battery size. In the example above, a 5kWh battery is a comfortable fit."] },
      { h: "Typical sizes for Lagos homes", p: ["Self-contain or 1-bedroom (lights, fans, TV, router): 1–2kW inverter with 1–2.5kWh storage, or a portable power station.", "2–3 bedroom flat (add a fridge and laptops): 3–5kW inverter with 5–10kWh storage.", "Duplex or home with AC: 6–10kW inverter with 10–20kWh storage and enough panels to recharge during the day."] },
      { h: "Don't forget the panels", p: ["Panels recharge the battery for free. In Lagos, plan on about 4–5 good sun hours a day. To refill a 5kWh battery in a day you need roughly 1.5–2kW of panels — three or four 550–620W panels."] },
    ],
    links: [{ label: "Size it with the power planner", href: "/#planner" }, { label: "Complete solar systems", href: "/category/complete-systems" }, { label: "Inverters", href: "/category/inverters" }],
  },
  {
    slug: "lithium-vs-tubular-battery-nigeria",
    title: "Lithium vs tubular batteries: which is better in Nigeria?",
    description: "Why LiFePO4 lithium batteries have replaced tubular lead-acid for most Lagos solar systems, and when the cheaper option still makes sense.",
    sections: [
      { h: "Lifespan", p: ["Lithium iron phosphate (LiFePO4) batteries are rated for thousands of charge cycles. Tubular lead-acid batteries typically last a few years with daily cycling, especially in hot rooms.", "With Lagos outages, your battery cycles almost every day, so cycle life matters more than the sticker price."] },
      { h: "Usable capacity", p: ["You can use most of a lithium battery's capacity every night. Lead-acid batteries last longer when you only use about half. A 5kWh lithium battery delivers roughly what a 10kWh lead-acid bank does."] },
      { h: "Space, weight and maintenance", p: ["Lithium batteries are wall-mounted or stacked in a compact cabinet and need no water top-ups. Tubular banks are heavy, take floor space and need ventilation."] },
      { h: "When tubular still makes sense", p: ["If budget is tight and outages are short, a small tubular setup can work. For daily backup, lithium usually costs less over its life."] },
    ],
    links: [{ label: "Lithium batteries", href: "/category/batteries" }, { label: "Power stations (battery + inverter in one)", href: "/category/power-stations" }],
  },
  {
    slug: "power-station-vs-inverter-system",
    title: "Portable power station or inverter system?",
    description: "When a plug-and-play power station like EcoFlow DELTA is enough, and when you should install a full inverter, battery and panel system.",
    sections: [
      { h: "Power stations: no installation", p: ["A power station is a battery, inverter and charger in one box. You plug appliances straight into it and charge it from the wall or a solar panel. It's ideal for renters, small apartments, home offices and anyone who moves often."] },
      { h: "Inverter systems: whole-house backup", p: ["A hybrid inverter connects to your house wiring so sockets and lights switch over automatically when power goes. It pairs with lithium batteries and rooftop panels, and scales to air conditioners and pumps."] },
      { h: "How to choose", p: ["Choose a power station if you want backup for a few rooms, can't drill or rewire, or need something portable.", "Choose an inverter system if you want the whole house covered, run heavy appliances, or want solar to cut your fuel and electricity bills."] },
    ],
    links: [{ label: "Portable power stations", href: "/category/power-stations" }, { label: "Complete solar systems", href: "/category/complete-systems" }],
  },
];
