import { db, id } from "@/lib/server/db";
import { body, fail, ok, requireUser, route, str } from "@/lib/server/api";
import { normalizePhone } from "@/lib/format";

const RESERVED = new Set(["admin", "api", "shop", "store", "solar", "support", "help", "www", "app"]);

/** Create or update the signed-in user's store. Commission is set by us, not by the seller. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const b = await body<{ name: string; slug: string; bio: string; kind: string; whatsapp: string }>(req);
  const name = str(b.name, 60);
  const slug = str(b.slug, 30).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2) return fail("Give your store a name.", 400, { fields: { name: "Required." } });
  if (slug.length < 3 || RESERVED.has(slug)) return fail("Pick a link name of at least 3 letters.", 400, { fields: { slug: "Try another link name." } });
  const kind = b.kind === "installer" ? "installer" : "affiliate";
  const sql = await db();
  const [taken] = await sql`select user_id from stores where slug = ${slug}`;
  if (taken && taken.user_id !== s.uid) return fail("That link name is taken.", 409, { fields: { slug: "Already taken." } });
  const values = { name, slug, bio: str(b.bio, 300), kind, whatsapp: normalizePhone(str(b.whatsapp, 20)) };
  const [mine] = await sql`select id from stores where user_id = ${s.uid}`;
  if (mine) await sql`update stores set ${sql(values)} where id = ${mine.id}`;
  else await sql`insert into stores ${sql({ id: id(), user_id: s.uid, ...values })}`;
  return ok({ slug, path: `/s/${slug}` });
});
