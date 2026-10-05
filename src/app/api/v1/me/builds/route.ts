import { db } from "@/lib/server/db";
import { ok, requireUser, route } from "@/lib/server/api";
import { priceCart } from "@/lib/server/rules";

/** The lists this person shared (with or without a store), newest first, priced today. */
export const GET = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sql = await db();
  const rows = await sql`select id, title, items, views, created_at from builds where user_id = ${s.uid} order by created_at desc limit 30`;
  const builds = rows.map((b) => {
    const c = priceCart(b.items);
    return { id: b.id, title: b.title, path: `/b/${b.id}`, items: c.lines.reduce((n, l) => n + l.qty, 0), total: c.total, views: b.views, created_at: b.created_at };
  });
  return ok({ builds });
});
