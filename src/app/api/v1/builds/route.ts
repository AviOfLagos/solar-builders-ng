import { db, code } from "@/lib/server/db";
import { body, fail, ok, route, str, currentUser, limitIp } from "@/lib/server/api";
import { priceCart, storedItems } from "@/lib/server/rules";
import { CART } from "@/config/store";
import { naira } from "@/lib/format";

/** Save a cart as a shareable build link (installers use this to send a quote). */
export const POST = route(async (req: Request) => {
  await limitIp(req, "builds", 30, 3600);
  const b = await body(req);
  const cart = priceCart(b.items);
  if (!cart.lines.length) return fail("Add products before sharing.");
  if (cart.total > CART.maxTotal) return fail(`Builds above ${naira(CART.maxTotal)} are quoted on WhatsApp.`);
  const s = await currentUser();
  const sql = await db();
  const [store] = s ? await sql`select id, slug from stores where user_id = ${s.uid}` : [];
  const bid = code();
  await sql`insert into builds ${sql({ id: bid, user_id: s?.uid ?? null, store_id: store?.id ?? null, title: str(b.title, 80), note: str(b.note, 500), items: sql.json(storedItems(cart.lines)) })}`;
  return ok({ id: bid, path: `/b/${bid}`, store: store?.slug ?? null, total: cart.total });
});
