/**
 * The installer interview on /engineers: onboarding for our installer network and research for our quotes.
 * Kept short on purpose. Answers are stored by key, so never reuse a key for a different question.
 * docs/ENGINEER_INTERVIEW.md mirrors this file.
 */
export type StepKey = "you" | "brands" | "pricing" | "checks" | "sample" | "work";
export type Question = { key: string; q: string; hint?: string; test?: boolean; step: StepKey };

/** The interview, one screen per step. */
export const STEPS: { key: StepKey; title: string; sub: string }[] = [
  { key: "you", title: "About you", sub: "So we know who we're talking to and where you work." },
  { key: "brands", title: "Brands you trust", sub: "Type, or tap the mic and say it." },
  { key: "pricing", title: "How you price a job", sub: "Rough figures are fine." },
  { key: "checks", title: "Two quick checks", sub: "We ask every installer these. Answer the way you'd explain it to a client." },
  { key: "sample", title: "Review our sample quote", sub: "Open it, look through it like a client just sent it to you, then tell us what you think." },
  { key: "work", title: "Working with us", sub: "Last step. Add photos of your work if you can." },
];

export const QUESTIONS: Question[] = [
  { step: "brands", key: "brands_premium", q: "Which brands do you recommend for clients with a good budget?", hint: "Inverters, batteries and panels" },
  { step: "brands", key: "brands_budget", q: "And which brands for low-budget clients?" },
  { step: "brands", key: "brands_refuse", q: "Which brands do you refuse to install, and why?" },
  { step: "pricing", key: "install_pricing", q: "What do you charge to install in a bungalow, and in a storey building?", hint: "For a typical 3–5 kVA home system" },
  { step: "pricing", key: "forgotten_items", q: "What do customers usually forget that you have to add? What does it cost?", hint: "cables, breakers, surge protector, earthing, mounting, changeover…" },
  { step: "checks", key: "test_sizing", q: "A client wants to run a 1.5HP AC and a fridge on a 3 kVA inverter with a 2.5 kWh battery. What do you tell them?", test: true },
  { step: "checks", key: "test_wiring", q: "What cable size, breaker and earthing do you use between a 5 kVA inverter and its battery?", test: true },
  { step: "sample", key: "sample_v1_first_check", q: "Looking at the sample quote, what's the first thing you check or question?" },
  { step: "sample", key: "sample_v1_changes", q: "What would you change, add or remove before you install it? Why?" },
  { step: "sample", key: "sample_v1_missing", q: "What's missing that you need to price the job and install it properly?", hint: "Details about the house, cable runs, accessories, anything you'd normally have to ask the client" },
  { step: "work", key: "why_us", q: "What would make you take jobs from us, and how fast can you finish a typical setup?" },
  { step: "work", key: "app_quotes", q: "Would you use an app to make quotes for your own clients? What's the one thing it must do?" },
];

/**
 * The sample quote installers review. Frozen on purpose: never edit a published version, so answers stay
 * comparable over time. To test a new quote format, add v2 with new question keys (sample_v2_…).
 * v1 is what our calculator gave for a family flat on 11 Oct 2026.
 */
export const SAMPLE_QUOTES = {
  v1: {
    version: "v1",
    date: "11 October 2026",
    client: {
      building: "3-bedroom bungalow", area: "Ikeja", use: "Home", roof: "Aluminium (longspan)", run: "About 15 m from roof to inverter spot",
      changeover: "Has a generator changeover", earthing: "Not sure",
      runs: ["8 LED bulbs", "3 fans", "TV + decoder", "Fridge", "Chest freezer", "1HP water pump", "Laptop"],
      hours: "About 10 hours a night without grid power",
    },
    need: { kw: 3.8, kwh: 8.8 },
    kit: {
      name: "Flat Comfort",
      product: "itel Complete 4kW Hybrid Solar System",
      contents: ["1× itel 4 kW hybrid inverter", "2× 5 kWh lithium batteries (10 kWh)", "8× 620 W solar panels (about 5 kW)"],
      price: 4_070_860,
    },
    install: [250_000, 450_000] as [number, number],
    notes: ["Free delivery in Lagos", "Installation is quoted separately by our engineer", "Sized with about 25% headroom over the load"],
  },
} as const;
export const SAMPLE = SAMPLE_QUOTES.v1;

/** Saved for installers we shortlist, so the first form stays short. */
export const FOLLOW_UP: Omit<Question, "step">[] = [
  { key: "custom_items", q: "What would you need to add to a quote that isn't a standard product?" },
  { key: "edit_others", q: "Would you want to load a quote from someone else into the app and edit it? What do you change most?" },
  { key: "send_quote", q: "How should a quote reach your client: WhatsApp link, PDF, with your own name and logo?" },
  { key: "after_install", q: "What usually goes wrong after an install, and what would prevent it?" },
  { key: "job_message", q: "If we send you a job on WhatsApp, what must it include for you to accept without calling the customer?" },
];

/**
 * What good and weak answers to the two test questions look like. The AI marks against this; a person makes the
 * final call. Written from general practice: check it against what your best installers say and adjust.
 */
export const MARKING_GUIDE = {
  test_sizing: {
    good: [
      "Notes a 1.5HP AC draws roughly 1.1–1.4 kW running and needs 3–5× that to start unless it is an inverter AC",
      "Counts the fridge's start-up surge too",
      "Says a 3 kVA inverter can start a 1.5HP inverter AC but may trip on a non-inverter one",
      "Works out that a 2.5 kWh battery (about 2 kWh usable) runs the AC only 1.5–2 hours",
      "Recommends an inverter AC, a bigger battery (5 kWh or more) and/or a 5 kVA inverter, or running the AC on daytime solar only",
    ],
    weak: ["Says it will run fine all night", "Ignores start-up surge", "Ignores battery capacity"],
  },
  test_wiring: {
    good: [
      "Starts from the system voltage: about 100–130 A at 48 V, over 200 A at 24 V",
      "Picks copper battery cable sized to that current and the run length (e.g. 25–35 mm² for a short 48 V run)",
      "Uses a DC-rated breaker or fuse just above the maximum current (about 125–150 A at 48 V)",
      "Keeps battery runs short with proper lugs and crimping",
      "Bonds inverter chassis and panel frames to an earth rod, and adds surge protection",
    ],
    weak: ["Uses an AC breaker on the DC side", "Thin cable such as 6–10 mm²", "No earthing", "No mention of voltage or current"],
  },
} as const;

export const YEARS = ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];
export const JOBS_PER_MONTH = ["0–2", "3–5", "6–10", "11–20", "20+"];
export const TEAM_SIZES = ["Just me", "2–3 people", "4–6 people", "7+ people"];

/** What we send once a decision is made. {first} is the installer's first name. */
export const DECISION_MESSAGES = {
  shortlisted: "Hi {first}, thank you for your interview with Solar Builders NG. You've been shortlisted for our installer network. We'll message you on WhatsApp to set up a short call and a few follow-up questions.",
  declined: "Hi {first}, thank you for taking the time to answer our installer interview. We're at capacity in your area right now, so we can't take you on yet. We've kept your details and will reach out when more jobs open up.",
} as const;
