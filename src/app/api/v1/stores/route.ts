import { db, id } from "@/lib/server/db";
import { body, fail, ok, requireUser, route, str, oneOf } from "@/lib/server/api";
import { NG_PHONE, normalizePhone, ngE164, isName } from "@/lib/format";

const RESERVED = new Set(["admin", "api", "shop", "store", "solar", "support", "help", "www", "app", "team", "fund", "account", "checkout", "solarbuilders", "gosolarme"]);

/** Create or update the signed-in user's store. Commission is set by us, not by the seller. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const b = await body(req);
  const name = str(b.name, 60);
  const slug = str(b.slug, 30).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const whatsapp = normalizePhone(str(b.whatsapp, 24));
  const fields: Record<string, string> = {};
  if (!isName(name)) fields.name = "Give your store a name.";
  if (slug.length < 3 || RESERVED.has(slug)) fields.slug = "Pick a link name of at least 3 letters.";
  if (whatsapp && !NG_PHONE.test(whatsapp)) fields.whatsapp = "Enter a Nigerian WhatsApp number or leave it empty.";
  if (Object.keys(fields).length) return fail("Check the highlighted fields.", 400, { fields });
  const kind = oneOf(b.kind, ["installer", "affiliate"] as const, "affiliate");
  const sql = await db();
  const [taken] = await sql`select user_id from stores where slug = ${slug}`;
  if (taken && taken.user_id !== s.uid) return fail("That link name is taken.", 409, { fields: { slug: "Already taken. Try another." } });
  const values = { name, slug, bio: str(b.bio, 300), kind, whatsapp: whatsapp ? ngE164(whatsapp).slice(1) : "" };
  const [mine] = await sql`select id from stores where user_id = ${s.uid}`;
  if (mine) await sql`update stores set ${sql(values)} where id = ${mine.id}`;
  else await sql`insert into stores ${sql({ id: id(), user_id: s.uid, ...values })} on conflict (user_id) do update set ${sql(values)}`;
  return ok({ slug, path: `/s/${slug}` });
});
