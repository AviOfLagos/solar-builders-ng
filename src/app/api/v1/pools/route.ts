import { db, code } from "@/lib/server/db";
import { body, fail, ok, requireUser, route, str } from "@/lib/server/api";
import { priceCart, storeBySlug, validateDelivery, type DeliveryInput } from "@/lib/server/commerce";

/** Start a public funding page for a kit. Anyone with the link can chip in. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const b = await body<{ items: unknown; title: string; story: string; occasion: string; ref: string } & DeliveryInput>(req);
  const cart = priceCart(b.items);
  if (!cart.lines.length) return fail("Add products to fund first.");
  const title = str(b.title, 80);
  if (title.length < 3) return fail("Give your page a title.", 400, { fields: { title: "e.g. Solar for Mum's house" } });
  const { values, errors } = validateDelivery({ ...b, email: s.email, name: b.name || s.name });
  if (Object.keys(errors).length) return fail("Check the delivery details.", 400, { fields: errors });
  const store = await storeBySlug(b.ref);
  const sql = await db();
  const pid = code();
  await sql`insert into pools ${sql({
    id: pid, user_id: s.uid, store_id: store?.id ?? null, title, story: str(b.story, 1000), occasion: str(b.occasion, 40),
    items: sql.json(cart.lines.map((l) => ({ id: l.p.id, qty: l.qty }))), goal: cart.total,
    delivery: sql.json({ name: values.forSomeoneElse ? values.recipientName : values.name, phone: values.forSomeoneElse ? values.recipientPhone : values.phone, altPhone: values.altPhone, address: values.address, lga: values.lga, landmark: values.landmark, notes: values.notes, installer: values.installer }),
  })}`;
  return ok({ id: pid, path: `/fund/${pid}`, goal: cart.total });
});

/** Recent open pages, for discovery. Addresses are never exposed. */
export const GET = route(async () => {
  const sql = await db();
  const pools = await sql`select p.id, p.title, p.occasion, p.goal, p.raised, p.created_at, u.name as owner from pools p join users u on u.id = p.user_id where p.status = 'open' order by p.created_at desc limit 20`;
  return ok({ pools });
});
