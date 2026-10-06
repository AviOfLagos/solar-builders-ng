import { body, ok, route, requireTeam } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { pricingOverview, setRule } from "@/lib/server/pricing-admin";

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok(await pricingOverview());
});

export const PUT = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const b = await body(req);
  const sql = await db();
  const [u] = await sql`select email from users where id = ${s.uid}`;
  await setRule({ scope: b.scope, key: b.key, markup: b.markup, fixed: b.fixed }, String(u?.email ?? ""));
  return ok(await pricingOverview());
});
