import { db } from "@/lib/server/db";
import { body, ok, requireUser, route, limitIp } from "@/lib/server/api";
import { createPool } from "@/lib/server/pools";

/** Start a Go Solar Me page for a kit. Public: anyone with the link chips in. Squad: fixed shares. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  await limitIp(req, "pools", 10, 3600);
  return ok(await createPool(s, await body(req)));
});

/** Recent open public pages, for discovery. Addresses are never exposed. */
export const GET = route(async () => {
  const sql = await db();
  const pools = await sql`select p.id, p.title, p.occasion, p.goal, p.raised, p.deadline, p.created_at, split_part(u.name, ' ', 1) as owner
    from pools p join users u on u.id = p.user_id where p.status = 'open' and p.kind = 'public' order by p.created_at desc limit 20`;
  return ok({ pools });
});
