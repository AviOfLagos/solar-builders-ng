import "server-only";
import { db, id } from "./db";
import { HttpError, str } from "./api";
import { NG_PHONE, normalizePhone, ngE164, isName } from "@/lib/format";
import { REGIONS } from "@/config/store";
import { SURVEY, YEARS, JOBS_PER_MONTH } from "@/data/engineer-survey";
import { notifyOwner } from "./mail";

const KEYS = SURVEY.flatMap((s) => s.questions);

/** Saves one installer's answers. If they ask to join, they're added to Installers as inactive for the team to check. */
export async function saveSurvey(b: Record<string, unknown>) {
  const name = str(b.name, 80);
  if (!isName(name)) throw new HttpError(400, "Add your name.", { fields: { name: "Your full name" } });
  const raw = normalizePhone(str(b.phone, 24));
  if (!NG_PHONE.test(raw)) throw new HttpError(400, "Add a Nigerian WhatsApp number.", { fields: { phone: "e.g. 0803 123 4567" } });
  const phone = ngE164(raw);
  const a = (b.answers && typeof b.answers === "object" ? b.answers : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const q of KEYS) {
    const v = str(a[q.key], 1500);
    if (v && (!q.choices || q.choices.includes(v))) answers[q.key] = v;
  }
  if (Object.keys(answers).length < 3) throw new HttpError(400, "Answer at least three questions so we can learn from you.");
  const region = REGIONS.some((r) => r.key === b.region) ? String(b.region) : "";
  const years = YEARS.includes(String(b.years)) ? String(b.years) : "";
  const jobs = JOBS_PER_MONTH.includes(String(b.jobsPerMonth)) ? String(b.jobsPerMonth) : "";
  const join = b.joinList === true;

  const sql = await db();
  let installerId: string | null = null;
  if (join) {
    const [have] = await sql`select id from installers where regexp_replace(phone, '\\D', '', 'g') = ${phone.replace(/\D/g, "")} limit 1`;
    installerId = have?.id ?? id();
    if (!have) await sql`insert into installers ${sql({ id: installerId, name, phone, primary_region: region, active: false, notes: `From the installer survey. ${years ? years + " installing, " : ""}${jobs ? jobs + " jobs a month." : ""}`.trim() })}`;
  }
  const sid = id();
  await sql`insert into engineer_survey ${sql({ id: sid, name, phone, region, years, jobs_per_month: jobs, answers: sql.json(answers), join_list: join, installer_id: installerId })}`;
  await notifyOwner(`Installer survey: ${name}\n${name} (${phone}) answered ${Object.keys(answers).length} questions${join ? " and asked to join the installer list" : ""}. See Admin → Research.`).catch(() => {});
  return { id: sid };
}

export async function surveyResponses() {
  const sql = await db();
  return sql`select s.*, i.active as installer_active from engineer_survey s left join installers i on i.id = s.installer_id order by s.created_at desc limit 200`;
}
