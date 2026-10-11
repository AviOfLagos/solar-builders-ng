import { body, ok, route, limitIp } from "@/lib/server/api";
import { saveSurvey } from "@/lib/server/survey";

/** Answers from the /engineers page. No sign-in: installers open it from a WhatsApp link. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "engineer-survey", 5, 3600);
  return ok(await saveSurvey(await body(req)));
});
