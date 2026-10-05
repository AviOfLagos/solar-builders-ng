import { body, ok, route, str, oneOf, limitIp } from "@/lib/server/api";
import { db } from "@/lib/server/db";

/** Page views and clicks from the site. No cookies, no names, no contact details: a per-tab id, the path and a label. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "events", 600, 3600);
  const b = await body(req);
  const kind = oneOf(b.kind, ["view", "click"] as const, "view");
  const path = str(b.path, 200).split("?")[0];
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/team")) return ok({});
  const sql = await db();
  await sql`insert into events ${sql({ sid: str(b.sid, 24), kind, path, name: str(b.name, 60), ref: str(b.ref, 120) })}`;
  return ok({});
});
