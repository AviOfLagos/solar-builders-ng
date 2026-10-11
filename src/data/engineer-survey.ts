/**
 * The installer interview on /engineers: onboarding for our installer network and research for our quotes.
 * Kept short on purpose. Answers are stored by key, so never reuse a key for a different question.
 * docs/ENGINEER_INTERVIEW.md mirrors this file.
 */
export type Question = { key: string; q: string; hint?: string; test?: boolean };

export const QUESTIONS: Question[] = [
  { key: "brands_premium", q: "Which brands do you recommend for clients with a good budget?" },
  { key: "brands_budget", q: "And which brands for low-budget clients?" },
  { key: "brands_refuse", q: "Which brands do you refuse to install, and why?" },
  { key: "install_pricing", q: "What do you charge to install in a bungalow, and in a storey building?", hint: "For a typical 3–5 kVA home system" },
  { key: "forgotten_items", q: "What do customers usually forget that you have to add? What does it cost?", hint: "cables, breakers, surge protector, earthing, mounting, changeover…" },
  { key: "test_sizing", q: "A client wants to run a 1.5HP AC and a fridge on a 3 kVA inverter with a 2.5 kWh battery. What do you tell them?", test: true },
  { key: "test_wiring", q: "What cable size, breaker and earthing do you use between a 5 kVA inverter and its battery?", test: true },
  { key: "why_us", q: "What would make you take jobs from us, and how fast can you finish a typical setup?" },
  { key: "quote_check", q: "When a client shows you a quote someone else made, what do you check or change first?" },
  { key: "app_quotes", q: "Would you use an app to make quotes for your own clients? What's the one thing it must do?" },
];

/** Saved for installers we shortlist, so the first form stays short. */
export const FOLLOW_UP: Question[] = [
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
