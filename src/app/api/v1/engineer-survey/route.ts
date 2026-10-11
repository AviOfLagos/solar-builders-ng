import { after } from "next/server";
import { body, ok, route, limitIp } from "@/lib/server/api";
import { saveSurvey, screenCandidate } from "@/lib/server/survey";

export const maxDuration = 60;

/** The installer interview from /engineers. No sign-in: installers open it from a shared link. Screening runs after the reply. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "engineer-survey", 5, 3600);
  const r = await saveSurvey(await body(req));
  after(() => screenCandidate(r.id));
  return ok(r);
});
