import "server-only";
import { db } from "./db";
import { priceCart, compactItems } from "./commerce";

export async function getBuild(bid: string, countView = false) {
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
  const sql = await db();
  const [s] = await sql`select s.id, s.slug, s.name, s.bio, s.kind, s.whatsapp, s.created_at, u.name as owner from stores s join users u on u.id = s.user_id where s.slug = ${slug.toLowerCase()}`;
  if (!s) return null;
  const builds = await sql`select id, title, note, items from builds where store_id = ${s.id} order by created_at desc limit 12`;
  return {
    slug: s.slug, name: s.name, bio: s.bio, kind: s.kind, whatsapp: s.whatsapp, owner: firstName(s.owner), since: s.created_at,
    builds: builds.map((b) => { const c = priceCart(b.items); return { id: b.id, title: b.title, note: b.note, items: compactItems(c.lines), total: c.total }; }),
  };
}

export async function getPool(pid: string) {
  const sql = await db();
  const [p] = await sql`select p.*, u.name as owner from pools p join users u on u.id = p.user_id where p.id = ${pid}`;
  if (!p) return null;
  const contributions = await sql`select name, message, amount, anonymous, created_at from contributions where pool_id = ${pid} and status = 'paid' order by created_at desc limit 100`;
  const cart = priceCart(p.items);
  return {
    id: p.id, title: p.title, story: p.story, occasion: p.occasion, owner: firstName(p.owner), lga: p.delivery?.lga ?? "",
    goal: p.goal, raised: p.raised, status: p.status, createdAt: p.created_at, items: compactItems(cart.lines),
    supporters: contributions.map((c) => ({ name: c.anonymous || !c.name ? "Anonymous" : c.name, message: c.message, amount: c.amount, at: c.created_at })),
  };
}

const firstName = (n: unknown) => String(n ?? "").split(" ")[0];
