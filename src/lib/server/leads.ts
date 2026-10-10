import "server-only";
import { NG_PHONE, INTL_PHONE, normalizePhone, ngE164, isEmail, isName } from "@/lib/format";
import { db, id } from "./db";
import { str, bool, oneOf, HttpError } from "./api";
import { priceCart, storedItems } from "./rules";
import type { Session } from "./session";
import { notifyOwner } from "./mail";
import { emit } from "./webhooks";
import { LAGOS_LGAS, SITE_QUESTIONS } from "@/config/store";

/** The site details engineers need, kept only when they match the options we offer. */
export function cleanSite(v: unknown) {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const pick = (k: keyof typeof SITE_QUESTIONS) => { const x = String(o[k] ?? ""); return SITE_QUESTIONS[k].some(([val]) => val === x) ? x : ""; };
  const run = Math.round(Number(o.panelRunM));
  const lga = String(o.lga ?? "");
  const site = {
    building: pick("building"), use: pick("use"), roof: pick("roof"), changeover: pick("changeover"), earthing: pick("earthing"),
    panelRunM: run > 0 && run <= 300 ? run : 0, lga: (LAGOS_LGAS as readonly string[]).includes(lga) ? lga : "", notes: str(o.notes, 500),
  };
  return Object.fromEntries(Object.entries(site).filter(([, x]) => x !== "" && x !== 0));
}

const SOURCES = ["cart", "checkout", "pool", "calculator", "finance", "gift", "package", "app", "brand", "quote"] as const;

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
  // A signed-in person is already reachable, so their cart is worth saving before they type anything.
  if (!phone && !validEmail && !existing && !user) throw new HttpError(400, "Enter a phone number or email we can reach you on.", { fields: { phone: "e.g. 0803 123 4567" } });
  const cart = priceCart(b.items);
  const v = {
    name: isName(name) ? name : "", phone, email: validEmail, consent: bool(b.consent),
    source: oneOf(b.source, SOURCES, "cart"), items: storedItems(cart.lines), total: cart.total,
  };
  const site = cleanSite(b.site);
  const sz = (b.sizing && typeof b.sizing === "object" ? b.sizing : {}) as Record<string, unknown>;
  const num = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x) : 0);
  const sizing = b.sizing ? { running: num(sz.running), kw: num(sz.kw), kwh: num(sz.kwh), hours: num(sz.hours), rulesVersion: num(sz.rulesVersion), from: str(sz.from, 60) } : {};
  const hasSite = Object.keys(site).length > 0;
  const sql = await db();
  if (existing) {
    const [u] = await sql`update leads set
        name = coalesce(nullif(${v.name}, ''), name), phone = coalesce(nullif(${v.phone}, ''), phone), email = coalesce(nullif(${v.email}, ''), email),
        consent = consent or ${v.consent}, items = case when ${v.items.length} > 0 then ${sql.json(v.items)} else items end,
        total = case when ${v.items.length} > 0 then ${v.total} else total end,
        user_id = coalesce(user_id, ${user?.uid ?? null}),
        site = case when ${hasSite} then ${sql.json(site)} else site end,
        sizing = case when ${hasSite} then ${sql.json(sizing)} else sizing end,
        source = case when ${v.source} = 'quote' then 'quote' else source end, updated_at = now()
      where id = ${lid} and order_id is null
        and (user_id is null or user_id = ${user?.uid ?? null}) returning id`;
    if (u) return { id: lid };
    // The id belongs to someone else's account: a stale id in a shared browser, or a passed-on
    // resume link. Never write their cart; fall through and start a row of our own.
    if (!phone && !validEmail && !user) return { id: null };
  }
  // One open row per signed-in person, so signing in on a second device continues the same cart
  // instead of leaving a trail of half-finished ones.
  if (user) {
    const [mine] = await sql`select id from leads where user_id = ${user.uid} and order_id is null order by updated_at desc limit 1`;
    if (mine) {
      await sql`update leads set
          name = coalesce(nullif(${v.name}, ''), name), phone = coalesce(nullif(${v.phone}, ''), phone), email = coalesce(nullif(${v.email}, ''), email),
          consent = consent or ${v.consent}, items = case when ${v.items.length} > 0 then ${sql.json(v.items)} else items end,
          total = case when ${v.items.length} > 0 then ${v.total} else total end,
          site = case when ${hasSite} then ${sql.json(site)} else site end,
          sizing = case when ${hasSite} then ${sql.json(sizing)} else sizing end,
          source = case when ${v.source} = 'quote' then 'quote' else source end, updated_at = now()
        where id = ${mine.id}`;
      return { id: mine.id as string };
    }
  }
  const nid = id();
  await sql`insert into leads ${sql({ id: nid, user_id: user?.uid ?? null, ...v, items: sql.json(v.items), site: sql.json(site), sizing: sql.json(sizing) })}`;
  if (v.phone && v.consent) await emit("lead.created", { id: nid, name: v.name, phone: v.phone, email: v.email, source: v.source, total: v.total, items: v.items, site, sizing });
  return { id: nid };
}

/** The signed-in person's unfinished cart, for picking up on another device. */
export async function userCart(uid: string) {
  const sql = await db();
  const [l] = await sql`select id, items, updated_at from leads
    where user_id = ${uid} and order_id is null order by updated_at desc limit 1`;
  if (!l) return { id: null, items: [], updatedAt: null };
  return {
    id: l.id as string,
    items: priceCart(l.items).lines.map((x) => ({ id: x.p.id, qty: x.qty })),
    updatedAt: l.updated_at as Date,
  };
}

/** The saved cart behind a resume link. No personal details. */
export async function leadCart(lid: string) {
  if (!/^[a-z0-9]{16}$/.test(lid)) return null;
  const sql = await db();
  const [l] = await sql`select items from leads where id = ${lid}`;
  return l ? { items: priceCart(l.items).lines.map((x) => ({ id: x.p.id, qty: x.qty })) } : null;
}

/** A brand asking to be stocked. Saved as a lead and sent to the team straight away. */
export async function saveBrandRequest(b: Record<string, unknown>) {
  const brand = str(b.brand, 80);
  const name = str(b.name, 80);
  const phoneRaw = normalizePhone(str(b.phone, 24));
  const phone = NG_PHONE.test(phoneRaw) ? ngE164(phoneRaw) : INTL_PHONE.test(phoneRaw) ? phoneRaw : "";
  const email = str(b.email, 120).toLowerCase();
  const products = str(b.products, 300);
  const site = str(b.site, 200);
  const fields: Record<string, string> = {};
  if (brand.length < 2) fields.brand = "Which brand?";
  if (!isName(name)) fields.name = "Who should we talk to?";
  if (!phone) fields.phone = "A WhatsApp number, e.g. 0803 123 4567";
  if (email && !isEmail(email)) fields.email = "Check the email, or leave it empty.";
  if (Object.keys(fields).length) throw new HttpError(400, "Check the highlighted fields.", { fields });
  const note = [`Brand: ${brand}`, products && `Products: ${products}`, site && `Site: ${site}`].filter(Boolean).join(" · ");
  const sql = await db();
  const nid = id();
  await sql`insert into leads ${sql({ id: nid, name, phone, email: isEmail(email) ? email : "", consent: true, source: "brand", items: sql.json([]), total: 0, note })}`;
  await emit("brand.requested", { id: nid, brand, name, phone, email, products, site });
  await notifyOwner(`Brand wants to be featured: ${brand}\n${name} · ${phone}${email ? " · " + email : ""}\n${note}`);
  return { id: nid };
}
