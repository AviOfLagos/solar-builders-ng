import { ok, route, requireTeam, str } from "@/lib/server/api";
import { adminLeads } from "@/lib/server/admin";

export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok({ leads: await adminLeads(str(new URL(req.url).searchParams.get("status"), 30)) });
});
