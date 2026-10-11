import "server-only";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { db, id } from "./db";
import { HttpError, str } from "./api";
import { NG_PHONE, normalizePhone, ngE164, isName, isEmail } from "@/lib/format";
import { REGIONS } from "@/config/store";
import { QUESTIONS, YEARS, JOBS_PER_MONTH, TEAM_SIZES, MARKING_GUIDE, DECISION_MESSAGES } from "@/data/engineer-survey";
import { notifyOwner, sendMail, shell, esc } from "./mail";
import { storedBytes } from "./uploads";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const model = () => (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? google(MODEL) : `google/${MODEL}`);
const PHOTO = /^installers\/photo\/[\w.-]+$/;
const VOICE = /^installers\/voice\/[\w.-]+$/;

/** Saves one installer's interview. Screening runs right after (see screenCandidate). */
export async function saveSurvey(b: Record<string, unknown>) {
  const name = str(b.name, 80);
  if (!isName(name)) throw new HttpError(400, "Add your name.", { fields: { name: "Your full name" } });
  const raw = normalizePhone(str(b.phone, 24));
  if (!NG_PHONE.test(raw)) throw new HttpError(400, "Add a Nigerian WhatsApp number.", { fields: { phone: "e.g. 0803 123 4567" } });
  const email = str(b.email, 120).toLowerCase();
  if (email && !isEmail(email)) throw new HttpError(400, "Check your email address, or leave it empty.", { fields: { email: "e.g. name@gmail.com" } });
  if (b.consent !== true) throw new HttpError(400, "Tick the box so we can contact you about your application.");
  const a = (b.answers && typeof b.answers === "object" ? b.answers : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const q of QUESTIONS) { const v = str(a[q.key], 2000); if (v) answers[q.key] = v; }
  if (Object.keys(answers).length < 5) throw new HttpError(400, "Answer at least five questions. You can type or record.");
  const list = (v: unknown, re: RegExp, max: number) => (Array.isArray(v) ? v.map(String).filter((p) => re.test(p)).slice(0, max) : []);
  const row = {
    id: id(), name, phone: ngE164(raw), email,
    region: REGIONS.some((r) => r.key === b.region) ? String(b.region) : "",
    years: YEARS.includes(String(b.years)) ? String(b.years) : "",
    jobs_per_month: JOBS_PER_MONTH.includes(String(b.jobsPerMonth)) ? String(b.jobsPerMonth) : "",
    team_size: TEAM_SIZES.includes(String(b.teamSize)) ? String(b.teamSize) : "",
    photos: list(b.photos, PHOTO, 3), voice: list(b.voice, VOICE, 20), join_list: true,
  };
  const sql = await db();
  const [dupe] = await sql`select id from engineer_survey where phone = ${row.phone} and created_at > now() - interval '1 day'`;
  if (dupe) throw new HttpError(409, "We already have your interview from today. Thank you, we'll be in touch.");
  await sql`insert into engineer_survey ${sql({ ...row, answers: sql.json(answers), photos: sql.json(row.photos), voice: sql.json(row.voice) })}`;
  await notifyOwner(`Installer interview: ${name}\n${name} (${row.phone}) answered ${Object.keys(answers).length} questions with ${row.photos.length} photos. See Admin → Installer research.`).catch(() => {});
  return { id: row.id };
}

// ---- voice answers ----

/** One voice note -> the answer text, in the installer's own words. */
export async function transcribe(audio: Uint8Array, type: string, questionKey: string) {
  const q = QUESTIONS.find((x) => x.key === questionKey);
  const { text } = await generateText({
    model: model(),
    messages: [{ role: "user", content: [
      { type: "text", text: `A solar installer in Lagos recorded this voice note${q ? ` answering: "${q.q}"` : ""}. Write their answer as clean text in the first person. Keep every number, price, size, unit and brand name exactly as said. If they speak Pidgin or Yoruba, write it in plain English. Return only the answer, no preamble. If the recording is silent or unclear, return an empty string.` },
      { type: "file", data: audio, mediaType: type },
    ] }],
  });
  return text.trim().replace(/^"|"$/g, "");
}

/** One long voice note -> answers to every question it covers. */
export async function transcribeAll(audio: Uint8Array, type: string) {
  const shape = Object.fromEntries(QUESTIONS.map((q) => [q.key, z.string().describe(q.q)]));
  const { output } = await generateText({
    model: model(),
    output: Output.object({ schema: z.object({ answers: z.object(shape).partial() }) }),
    messages: [{ role: "user", content: [
      { type: "text", text: `A solar installer in Lagos recorded one voice note answering our interview. Put what they said under the matching question, in the first person, keeping every number, price, size and brand name exactly. Leave out questions they didn't answer. Pidgin or Yoruba goes into plain English.\n\nQuestions:\n${QUESTIONS.map((q) => `${q.key}: ${q.q}`).join("\n")}` },
      { type: "file", data: audio, mediaType: type },
    ] }],
  });
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(output?.answers ?? {})) if (typeof v === "string" && v.trim()) out[k] = v.trim();
  return out;
}

// ---- screening ----

const Screen = z.object({
  score: z.number().describe("0-100: how confident we can be that this person installs safely and competently"),
  verdict: z.enum(["shortlist", "decline", "review"]).describe("review when the answers are too thin to judge"),
  summary: z.string().describe("Two sentences for the team"),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  tests: z.object({ test_sizing: z.number().describe("0-10"), test_wiring: z.number().describe("0-10") }),
  photos: z.string().describe("What the photos show about their workmanship, or 'no photos'"),
  extracted: z.object({
    premiumBrands: z.array(z.string()), budgetBrands: z.array(z.string()), refusedBrands: z.array(z.string()),
    installBungalow: z.string().describe("Their bungalow install price as said, e.g. '₦80k–₦120k', or ''"),
    installStorey: z.string().describe("Their storey-building install price as said, or ''"),
    forgottenItems: z.array(z.object({ item: z.string(), cost: z.string() })),
    setupDays: z.string().describe("How long a typical setup takes them, as said, or ''"),
    quoteChecks: z.array(z.string()).describe("What they check or change first in someone else's quote"),
    appMustDo: z.string(),
  }),
});
export type Screening = z.infer<typeof Screen>;

/**
 * Marks one interview against the marking guide and photos, pulls out the facts we use to improve quotes,
 * and sets a decision when the AI is sure. Nothing is sent to the installer until the team presses Send.
 */
export async function screenCandidate(sid: string) {
  const sql = await db();
  const [r] = await sql`select * from engineer_survey where id = ${sid}`;
  if (!r) return;
  const answers = r.answers as Record<string, string>;
  const photos = (await Promise.all((r.photos as string[]).map((p) => storedBytes(p).catch(() => null)))).filter((x) => !!x);
  const text = [
    `Screen this applicant for a Lagos solar installer network. We give them paid install jobs, so safety and competence matter most; honest "it depends" answers beat confident wrong ones.`,
    `Profile: ${r.years || "years not given"} installing, ${r.jobs_per_month || "?"} jobs a month, team: ${r.team_size || "not given"}.`,
    `Marking guide for the two test questions:\n${JSON.stringify(MARKING_GUIDE, null, 1)}`,
    `Shortlist when both tests score 6+ and nothing unsafe is said. Decline when either test shows unsafe practice (AC breaker on DC, no earthing, cable far too thin) or the answers show no real installation experience. Otherwise review.`,
    `Answers:\n${QUESTIONS.map((q) => `${q.q}\n> ${answers[q.key] || "(no answer)"}`).join("\n\n")}`,
    photos.length ? `${photos.length} photos of their past installs are attached.` : "No photos were sent.",
  ].join("\n\n");
  try {
    const { output } = await generateText({
      model: model(),
      output: Output.object({ schema: Screen }),
      messages: [{ role: "user", content: [{ type: "text", text }, ...photos.map((p) => ({ type: "file" as const, data: p!.bytes, mediaType: p!.type }))] }],
    });
    if (!output) return;
    const decision = output.verdict === "shortlist" ? "shortlisted" : output.verdict === "decline" ? "declined" : "review";
    await sql`update engineer_survey set ai = ${sql.json({ ...output, at: new Date().toISOString(), model: MODEL })},
      decision = case when decision in ('pending', 'review') or (decided_by = 'ai' and notified_at is null) then ${decision} else decision end,
      decided_by = case when decision in ('pending', 'review') or (decided_by = 'ai' and notified_at is null) then 'ai' else decided_by end
      where id = ${sid}`;
  } catch (e) {
    console.error("[screen]", e);
    await sql`update engineer_survey set ai = ${sql.json({ error: String((e as Error).message ?? e).slice(0, 300), at: new Date().toISOString() })} where id = ${sid}`;
  }
}

// ---- the team's side ----

export async function surveyResponses() {
  const sql = await db();
  return sql`select s.id, s.name, s.phone, s.email, s.region, s.years, s.jobs_per_month, s.team_size, s.answers, s.photos, s.voice, s.ai,
      s.decision, s.decided_by, s.notified_at, s.created_at, s.installer_id, i.active as installer_active
    from engineer_survey s left join installers i on i.id = s.installer_id order by s.created_at desc limit 300`;
}

/** The team overrides or confirms a decision. A shortlisted installer is added to Installers (inactive until onboarded). */
export async function decide(sid: string, decision: string, by: string) {
  if (!["shortlisted", "declined", "review"].includes(decision)) throw new HttpError(400, "Unknown decision.");
  const sql = await db();
  const [r] = await sql`update engineer_survey set decision = ${decision}, decided_by = ${by} where id = ${sid} returning id`;
  if (!r) throw new HttpError(404, "Interview not found.");
  if (decision === "shortlisted") await addInstaller(sid);
}

async function addInstaller(sid: string) {
  const sql = await db();
  const [r] = await sql`select * from engineer_survey where id = ${sid}`;
  if (!r || r.installer_id) return;
  const [have] = await sql`select id from installers where regexp_replace(phone, '\\D', '', 'g') = ${String(r.phone).replace(/\D/g, "")} limit 1`;
  const iid = have?.id ?? id();
  if (!have) await sql`insert into installers ${sql({ id: iid, name: r.name, phone: r.phone, email: r.email, primary_region: r.region, active: false, notes: `From the installer interview. ${[r.years && r.years + " installing", r.team_size, r.jobs_per_month && r.jobs_per_month + " jobs a month"].filter(Boolean).join(", ")}.` })}`;
  await sql`update engineer_survey set installer_id = ${iid} where id = ${sid}`;
}

const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const decisionText = (name: string, d: "shortlisted" | "declined") => DECISION_MESSAGES[d].replace("{first}", name.split(/\s+/)[0] || "there");

/**
 * Tells everyone with a decision who hasn't heard yet: email when we have one, plus a WhatsApp link per person
 * for the team to send (our WhatsApp number can't message first yet). Shortlisted people are added to Installers.
 */
export async function sendDecisions(by: string) {
  const sql = await db();
  const rows = await sql`select id, name, phone, email, decision from engineer_survey where decision in ('shortlisted', 'declined') and notified_at is null order by created_at limit 100`;
  const out: { id: string; name: string; decision: string; emailed: boolean; wa: string }[] = [];
  for (const r of rows) {
    const d = r.decision as "shortlisted" | "declined";
    const text = decisionText(r.name, d);
    let emailed = false;
    if (r.email) {
      const m = await sendMail({ to: [r.email], subject: d === "shortlisted" ? "You've been shortlisted: Solar Builders NG installers" : "Your Solar Builders NG installer interview", html: shell(d === "shortlisted" ? "You're shortlisted" : "Thank you", `<p>${esc(text)}</p>`), text }).catch(() => ({ ok: false }));
      emailed = m.ok;
    }
    if (d === "shortlisted") await addInstaller(r.id);
    await sql`update engineer_survey set notified_at = now(), decided_by = case when decided_by = '' then ${by} else decided_by end where id = ${r.id}`;
    out.push({ id: r.id, name: r.name, decision: d, emailed, wa: waLink(r.phone, text) });
  }
  return out;
}

/** What strong installers agree on: the inputs for better quotes, brand picks and install pricing. */
export async function insights() {
  const sql = await db();
  const rows = await sql`select ai from engineer_survey where (decision = 'shortlisted' or (ai->>'score')::int >= 70) and ai ? 'extracted'`;
  const count = (key: keyof Screening["extracted"]) => {
    const m = new Map<string, number>();
    for (const r of rows) for (const b of ((r.ai as Screening).extracted[key] as string[]) ?? []) { const k = b.trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, n]) => ({ name, n }));
  };
  const ex = rows.map((r) => (r.ai as Screening).extracted);
  return {
    candidates: rows.length,
    premiumBrands: count("premiumBrands"), budgetBrands: count("budgetBrands"), refusedBrands: count("refusedBrands"),
    quoteChecks: count("quoteChecks"),
    installBungalow: ex.map((e) => e.installBungalow).filter(Boolean),
    installStorey: ex.map((e) => e.installStorey).filter(Boolean),
    forgottenItems: ex.flatMap((e) => e.forgottenItems).filter((f) => f.item),
    setupDays: ex.map((e) => e.setupDays).filter(Boolean),
    appMustDo: ex.map((e) => e.appMustDo).filter(Boolean),
  };
}
