import { ok, route, requireTeam } from "@/lib/server/api";
import { adminPools } from "@/lib/server/admin";

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok({ pools: await adminPools() });
});
