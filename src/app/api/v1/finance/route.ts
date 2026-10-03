import { db, id } from "@/lib/server/db";
import { body, fail, ok, route, str, int, oneOf, currentUser, limitIp } from "@/lib/server/api";
import { priceCart, storedItems } from "@/lib/server/rules";
import { notifyOwner } from "@/lib/server/mail";
import { NG_PHONE, normalizePhone, ngE164, naira, isEmail, isName } from "@/lib/format";
import { FINANCE, CART } from "@/config/store";

/** Pay-small-small request. A partner lender approves; nothing is charged here. */
export const POST = route(async (req: Request) => {
  await limitIp(req, "finance", 5, 3600);
  const b = await body(req);
  const cart = priceCart(b.items);
  if (cart.total < FINANCE.minTotal) return fail(`Pay small small starts from ${naira(FINANCE.minTotal)} carts.`);
  if (cart.total > CART.maxTotal) return fail("For orders this size, message us on WhatsApp.");
  const name = str(b.name, 80), phone = normalizePhone(str(b.phone, 24)), email = str(b.email, 120).toLowerCase();
  const fields: Record<string, string> = {};
  if (!isName(name)) fields.name = "Enter your name.";
  if (!NG_PHONE.test(phone)) fields.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
  if (email && !isEmail(email)) fields.email = "Enter a valid email or leave it empty.";
  const employment = oneOf(b.employment, FINANCE.employment, "" as never);
  const incomeBand = oneOf(b.incomeBand, FINANCE.incomeBands, "" as never);
  if (!employment) fields.employment = "Choose one.";
  if (!incomeBand) fields.incomeBand = "Choose one.";
  if (Object.keys(fields).length) return fail("Check the highlighted fields.", 400, { fields });
  const downPct = FINANCE.downPayments.includes(int(b.downPct)) ? int(b.downPct) : FINANCE.downPayments[0];
  const months = FINANCE.months.includes(int(b.months)) ? int(b.months) : FINANCE.months[0];
  const s = await currentUser();
  const sql = await db();
  const rid = id();
  await sql`insert into finance_requests ${sql({ id: rid, user_id: s?.uid ?? null, name, phone: ngE164(phone), email, employment, income_band: incomeBand, items: sql.json(storedItems(cart.lines)), total: cart.total, down_pct: downPct, months })}`;
  await notifyOwner(`PAY SMALL SMALL request ${rid} — ${naira(cart.total)}, ${downPct}% down, ${months} months\n${name} · ${ngE164(phone)} · ${email}\n${employment} · income ${incomeBand}\n${cart.lines.map((l) => `- ${l.qty} x ${l.p.name}`).join("\n")}`);
  return ok({ id: rid });
});
