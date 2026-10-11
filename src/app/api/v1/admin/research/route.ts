import { after } from "next/server";
import { body, fail, ok, route, requireTeam, str } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { decide, insights, screenCandidate, sendDecisions, surveyResponses } from "@/lib/server/survey";

export const maxDuration = 60;

/** GET -> every interview and what strong installers agree on. */
export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const [responses, summary] = await Promise.all([surveyResponses(), insights()]);
  return ok({ responses, insights: summary });
});

/** POST { action: "decide", id, decision } | { action: "send" } | { action: "rescreen", id }. */
export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const b = await body(req);
  const sql = await db();
  const [u] = await sql`select email from users where id = ${s.uid}`;
  const by = String(u?.email ?? "team");
  if (b.action === "decide") { await decide(str(b.id, 40), str(b.decision, 20), by); return ok({ responses: await surveyResponses() }); }
  if (b.action === "send") { const sent = await sendDecisions(by); return ok({ sent, responses: await surveyResponses() }); }
  if (b.action === "rescreen") { const sid = str(b.id, 40); await sql`update engineer_survey set ai = '{}' where id = ${sid}`; after(() => screenCandidate(sid)); return ok({ responses: await surveyResponses() }); }
  return fail("Unknown action.");
});
