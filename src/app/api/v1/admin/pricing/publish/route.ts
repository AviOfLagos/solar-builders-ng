import { ok, route, requireTeam } from "@/lib/server/api";
import { publishPrices } from "@/lib/server/pricing-admin";

export const POST = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  await publishPrices();
  return ok({ ok: true });
});
