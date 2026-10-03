import "server-only";
import { firstName } from "@/lib/format";
import { db } from "./db";
import { priceCart, compactItems } from "./rules";

export async function getBuild(bid: string, countView = false) {
  if (!/^[a-z0-9]{6,16}$/.test(bid)) return null;
  const sql = await db();
  const [b] = await sql`select b.id, b.title, b.note, b.items, b.created_at, s.slug as store_slug, s.name as store_name, s.kind as store_kind, s.whatsapp as store_whatsapp, u.name as author
    from builds b left join stores s on s.id = b.store_id left join users u on u.id = b.user_id where b.id = ${bid}`;
  if (!b) return null;
  if (countView) await sql`update builds set views = views + 1 where id = ${bid}`;
  const cart = priceCart(b.items);
  return {
    id: b.id, title: b.title, note: b.note, createdAt: b.created_at, author: firstName(b.author),
    store: b.store_slug ? { slug: b.store_slug, name: b.store_name, kind: b.store_kind, whatsapp: b.store_whatsapp } : null,
    items: compactItems(cart.lines), total: cart.total,
  };
}

export async function getStorePage(slug: string) {
  const s0 = slug.toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(s0)) return null;
  const sql = await db();
  const [s] = await sql`select s.id, s.slug, s.name, s.bio, s.kind, s.whatsapp, s.created_at, u.name as owner from stores s join users u on u.id = s.user_id where s.slug = ${s0}`;
  if (!s) return null;
  const builds = await sql`select id, title, note, items from builds where store_id = ${s.id} order by created_at desc limit 12`;
  return {
    slug: s.slug, name: s.name, bio: s.bio, kind: s.kind, whatsapp: s.whatsapp, owner: firstName(s.owner), since: s.created_at,
    builds: builds.map((b) => { const c = priceCart(b.items); return { id: b.id, title: b.title, note: b.note, items: compactItems(c.lines), total: c.total }; }),
  };
}
