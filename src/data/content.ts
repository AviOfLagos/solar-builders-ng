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
    a: "Visa and Mastercard debit or credit cards, processed securely by Stripe. You can save cards, give each one a name, and pick it at checkout next time.",
  },
  {
    q: "When is Solar Friday?",
    a: "Every Friday (Lagos time) we run Solar Friday deals on selected batteries, inverters, panels and power stations. Join the mailing list to get a reminder.",
  },
];

export type Guide = { slug: string; title: string; description: string; sections: { h: string; p: string[] }[]; links: { label: string; href: string }[] };

export const GUIDES: Guide[] = [
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
