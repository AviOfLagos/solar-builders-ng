import { db, id } from "@/lib/server/db";
import { body, fail, ok, route, str, int } from "@/lib/server/api";
import { getSession } from "@/lib/server/session";
import { priceCart } from "@/lib/server/commerce";
import { notifyOwner } from "@/lib/server/mail";
import { NG_PHONE, normalizePhone, naira } from "@/lib/format";
import { FINANCE } from "@/config/store";

/** Pay-small-small request. A partner lender approves; nothing is charged here. */
export const POST = route(async (req: Request) => {
  const b = await body<{ items: unknown; name: string; phone: string; email: string; employment: string; incomeBand: string; downPct: number; months: number }>(req);
  const cart = priceCart(b.items);
  if (cart.total < FINANCE.minTotal) return fail(`Pay small small starts from ${naira(FINANCE.minTotal)} carts.`);
  const name = str(b.name, 80), phone = normalizePhone(str(b.phone, 20));
  if (name.length < 2) return fail("Enter your name.", 400, { fields: { name: "Required." } });
  if (!NG_PHONE.test(phone)) return fail("Enter a Nigerian mobile number.", 400, { fields: { phone: "e.g. 0803 123 4567" } });
  const downPct = FINANCE.downPayments.includes(int(b.downPct)) ? int(b.downPct) : FINANCE.downPayments[0];
  const months = FINANCE.months.includes(int(b.months)) ? int(b.months) : FINANCE.months[0];
  const s = await getSession();
  const sql = await db();
  const rid = id();
  await sql`insert into finance_requests ${sql({ id: rid, user_id: s?.uid ?? null, name, phone, email: str(b.email, 120), employment: str(b.employment, 40), income_band: str(b.incomeBand, 40), items: sql.json(cart.lines.map((l) => ({ id: l.p.id, qty: l.qty, name: l.p.name }))), total: cart.total, down_pct: downPct, months })}`;
  await notifyOwner(`PAY SMALL SMALL request ${rid} — ${naira(cart.total)}, ${downPct}% down, ${months} months\n${name} · ${phone} · ${str(b.email, 120)}\n${str(b.employment, 40)} · income ${str(b.incomeBand, 40)}\n${cart.lines.map((l) => `- ${l.qty} x ${l.p.name}`).join("\n")}`);
  return ok({ id: rid });
});
