/**
 * Questions for solar installers: what a quote must contain so they never need to ask the customer
 * anything, and what they'd want in the app. The /engineers page renders these; docs/ENGINEER_INTERVIEW.md mirrors them.
 * Keys are stored with each answer, so never reuse a key for a different question.
 */
export type Question = { key: string; q: string; hint?: string; choices?: string[] };

export const SURVEY: { title: string; questions: Question[] }[] = [
  {
    title: "Our quotes",
    questions: [
      { key: "quote_review", q: "Look at the sample quote above. What's wrong or missing, or what would you change before installing it?" },
      { key: "site_info", q: "What do you always need to know about the house before you can price a job?", hint: "e.g. upstairs or bungalow, roof type, distance, existing wiring" },
      { key: "forgotten_items", q: "What items do customers forget that you end up adding? What do they usually cost?", hint: "cables, breakers, surge protector, earthing, mounting, changeover…" },
      { key: "install_pricing", q: "How do you price installation: by system size, building type or distance? What are your usual price bands?" },
      { key: "headroom", q: "How much extra capacity do you add over what the customer asks for (inverter, battery, panels)?" },
      { key: "brands", q: "Which brands do you trust, and which do you refuse to install? Why?" },
      { key: "after_install", q: "What usually goes wrong after an install (callbacks, faults)? What would prevent it?" },
      { key: "job_message", q: "If we send you a job on WhatsApp, what must it include for you to accept without calling the customer? How fast can you reply?" },
    ],
  },
  {
    title: "The app",
    questions: [
      { key: "app_quotes", q: "Would you use an app to make quotes for your own clients?", choices: ["Yes", "Maybe", "No"] },
      { key: "app_must_do", q: "What must that app do for you to use it every week?" },
      { key: "custom_items", q: "What would you need to add to a quote that isn't a standard product?", hint: "labour lines, extra cable, trunking, scaffolding, transport…" },
      { key: "edit_others", q: "When a client shows you a quote from someone else, would you want to load it into the app and edit it? What do you change most often?" },
      { key: "send_quote", q: "How should a quote reach your client?", hint: "WhatsApp link, PDF, with your own name and logo…" },
      { key: "why_us", q: "What would make you take jobs through us instead of finding your own?", hint: "steady jobs, fast pay, equipment delivered to site…" },
      { key: "payment", q: "How do you want to be paid for a job, and how fast?" },
    ],
  },
];

export const YEARS = ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];
export const JOBS_PER_MONTH = ["0–2", "3–5", "6–10", "11–20", "20+"];
