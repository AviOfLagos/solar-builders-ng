import "server-only";
import { NG_PHONE, INTL_PHONE, normalizePhone, ngE164, isEmail, isName } from "@/lib/format";
import { db, id } from "./db";
import { str, bool, oneOf, HttpError } from "./api";
import { priceCart, storedItems } from "./rules";
import type { Session } from "./session";

const SOURCES = ["cart", "checkout", "pool", "calculator", "finance", "gift", "package", "app"] as const;

/**
 * Saves who someone is and what's in their cart as soon as we have a way to reach them,
 * so the team can follow up if they don't finish. One row per browser (the id is kept on the device).
 */
export async function saveLead(b: Record<string, unknown>, user: Session | null) {
  const phoneRaw = normalizePhone(str(b.phone, 24));
  const phone = NG_PHONE.test(phoneRaw) ? ngE164(phoneRaw) : INTL_PHONE.test(phoneRaw) ? phoneRaw : "";
  const email = str(b.email, 120).toLowerCase();
  const name = str(b.name, 80);
  const validEmail = isEmail(email) ? email : "";
  const lid = str(b.id, 20);
  const existing = /^[a-z0-9]{16}$/.test(lid);
  if (!phone && !validEmail && !existing) throw new HttpError(400, "Enter a phone number or email we can reach you on.", { fields: { phone: "e.g. 0803 123 4567" } });
  const cart = priceCart(b.items);
  const v = {
    name: isName(name) ? name : "", phone, email: validEmail, consent: bool(b.consent),
    source: oneOf(b.source, SOURCES, "cart"), items: storedItems(cart.lines), total: cart.total,
  };
  const sql = await db();
  if (existing) {
    const [u] = await sql`update leads set
        name = coalesce(nullif(${v.name}, ''), name), phone = coalesce(nullif(${v.phone}, ''), phone), email = coalesce(nullif(${v.email}, ''), email),
        consent = consent or ${v.consent}, items = case when ${v.items.length} > 0 then ${sql.json(v.items)} else items end,
        total = case when ${v.items.length} > 0 then ${v.total} else total end,
        user_id = coalesce(user_id, ${user?.uid ?? null}), updated_at = now()
      where id = ${lid} and order_id is null returning id`;
    if (u) return { id: lid };
    if (!phone && !validEmail) return { id: null };
  }
  const nid = id();
  await sql`insert into leads ${sql({ id: nid, user_id: user?.uid ?? null, ...v, items: sql.json(v.items) })}`;
  return { id: nid };
}

/** The saved cart behind a resume link. No personal details. */
export async function leadCart(lid: string) {
  if (!/^[a-z0-9]{16}$/.test(lid)) return null;
  const sql = await db();
  const [l] = await sql`select items from leads where id = ${lid}`;
  return l ? { items: priceCart(l.items).lines.map((x) => ({ id: x.p.id, qty: x.qty })) } : null;
}
