import { db, code } from "@/lib/server/db";
import { body, fail, ok, route, str } from "@/lib/server/api";
import { getSession } from "@/lib/server/session";
import { priceCart } from "@/lib/server/commerce";

/** Save a cart as a shareable build link (installers use this to send a quote). */
export const POST = route(async (req: Request) => {
  const b = await body<{ items: unknown; title: string; note: string }>(req);
  const cart = priceCart(b.items);
  if (!cart.lines.length) return fail("Add products before sharing.");
  const s = await getSession();
  const sql = await db();
  const [store] = s ? await sql`select id, slug from stores where user_id = ${s.uid}` : [];
  const bid = code();
  await sql`insert into builds ${sql({ id: bid, user_id: s?.uid ?? null, store_id: store?.id ?? null, title: str(b.title, 80), note: str(b.note, 500), items: sql.json(cart.lines.map((l) => ({ id: l.p.id, qty: l.qty }))) })}`;
  return ok({ id: bid, path: `/b/${bid}`, store: store?.slug ?? null, total: cart.total });
});
