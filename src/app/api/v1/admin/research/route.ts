import { ok, route, requireTeam } from "@/lib/server/api";
import { surveyResponses } from "@/lib/server/survey";

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok({ responses: await surveyResponses() });
});
