import { ok, route, requireTeam, str } from "@/lib/server/api";
import { adminOrders } from "@/lib/server/admin";

export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const p = new URL(req.url).searchParams;
  return ok({ orders: await adminOrders(str(p.get("status"), 30), str(p.get("q"), 60)) });
});
