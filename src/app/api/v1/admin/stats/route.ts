import { ok, route, requireTeam } from "@/lib/server/api";
import { adminStats } from "@/lib/server/admin";

/** Admin overview: money, orders, visitors, funnel, top pages and what needs attention. */
export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const d = Number(new URL(req.url).searchParams.get("days"));
  return ok(await adminStats([7, 30, 90].includes(d) ? d : 30));
});
