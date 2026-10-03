import "server-only";
import type Stripe from "stripe";
import { getProductById, brandName, type Product } from "@/lib/catalog";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { NG_PHONE, normalizePhone, isEmail, naira } from "@/lib/format";
import { db, code, id } from "./db";
import { stripe, customerFor, ownsCard, MIN_CHARGE_NGN } from "./stripe";
import { sendMail, shell, esc, notifyOwner } from "./mail";
import type { Session } from "./session";

export type CartLine = { id: string; qty: number };
type Line = { p: Product; qty: number };

/* ---------- cart ---------- */

export function priceCart(items: unknown): { lines: Line[]; subtotal: number; delivery: number; total: number } {
  const arr = Array.isArray(items) ? items.slice(0, 40) : [];
  const lines = arr
    .map((l: CartLine) => ({ p: getProductById(String(l?.id)), qty: Math.max(1, Math.min(50, Math.floor(Number(l?.qty) || 1))) }))
    .filter((l): l is Line => !!l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const delivery = lines.length ? STORE.deliveryFee : 0;
  return { lines, subtotal, delivery, total: subtotal + delivery };
}

export const compactItems = (lines: Line[]) => lines.map((l) => ({ id: l.p.id, qty: l.qty, name: l.p.name, price: l.p.price }));

/* ---------- validation ---------- */

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

export type DeliveryInput = {
  name: string; email: string; phone: string; altPhone?: string;
  address: string; lga: string; landmark?: string; notes?: string; installer?: boolean;
  forSomeoneElse?: boolean; recipientName?: string; recipientPhone?: string; giftMessage?: string;
};

/** Buyer and delivery details. When buying for someone else, the address is the recipient's. */
export function validateDelivery(i: Partial<DeliveryInput>, opts: { requireBuyerPhone?: boolean } = { requireBuyerPhone: true }) {
  const errors: Record<string, string> = {};
  const v = {
    name: clip(i.name, 80),
    email: clip(i.email, 120).toLowerCase(),
    phone: normalizePhone(clip(i.phone, 20)),
    altPhone: normalizePhone(clip(i.altPhone, 20)),
    address: clip(i.address, 300),
    lga: clip(i.lga, 40),
    landmark: clip(i.landmark, 120),
    notes: clip(i.notes, 300),
    installer: !!i.installer,
    forSomeoneElse: !!i.forSomeoneElse,
    recipientName: clip(i.recipientName, 80),
    recipientPhone: normalizePhone(clip(i.recipientPhone, 20)),
    giftMessage: clip(i.giftMessage, 300),
  };
  if (v.name.length < 2) errors.name = "Enter your full name.";
  if (!isEmail(v.email)) errors.email = "Enter a valid email address.";
  // Buyers abroad may not have a Nigerian number; the recipient's number is what we call.
  if (v.forSomeoneElse) {
    if (v.phone && !/^\+?\d{7,15}$/.test(v.phone)) errors.phone = "Enter a valid phone number with country code.";
    if (v.recipientName.length < 2) errors.recipientName = "Enter the name of the person receiving it.";
    if (!NG_PHONE.test(v.recipientPhone)) errors.recipientPhone = "Enter their Nigerian mobile number. We call them to arrange delivery.";
  } else if (opts.requireBuyerPhone && !NG_PHONE.test(v.phone)) errors.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
  if (v.altPhone && !NG_PHONE.test(v.altPhone)) errors.altPhone = "Enter a valid alternate number or leave it empty.";
  if (v.address.length < 8) errors.address = "Enter the full delivery address.";
  if (!(LAGOS_LGAS as readonly string[]).includes(v.lga)) errors.lga = "We deliver within Lagos only. Pick the LGA.";
  return { values: v, errors };
}
export type Delivery = ReturnType<typeof validateDelivery>["values"];

const deliveryJson = (v: Delivery) => ({
  name: v.forSomeoneElse ? v.recipientName : v.name,
  phone: v.forSomeoneElse ? v.recipientPhone : v.phone,
  altPhone: v.altPhone, address: v.address, lga: v.lga, landmark: v.landmark, notes: v.notes,
});

/* ---------- stores & referrals ---------- */

export async function storeBySlug(slug: unknown) {
  const s = clip(slug, 40).toLowerCase();
  if (!s) return null;
  const sql = await db();
  const [row] = await sql`select id, user_id, slug, name, bio, kind, commission_bps, whatsapp from stores where slug = ${s}`;
  return row ?? null;
}

/* ---------- gift cards ---------- */

export async function giftCardBalance(c: unknown) {
  const k = clip(c, 20).toUpperCase().replace(/\s/g, "");
  if (!k) return null;
  const sql = await db();
  const [g] = await sql`select code, balance, status from gift_cards where code = ${k}`;
  return g && g.status === "active" ? { code: g.code as string, balance: g.balance as number } : null;
}

/* ---------- checkout ---------- */

export type CheckoutInput = DeliveryInput & {
  items: CartLine[]; ref?: string; giftCode?: string;
  saveCard?: boolean; cardNickname?: string; savedCardId?: string; source?: string;
};

export async function startCheckout(input: Partial<CheckoutInput>, session: Session | null, origin: string) {
  const cart = priceCart(input.items);
  if (!cart.lines.length) return { error: "Your cart is empty.", status: 400 as const };
  const { values, errors } = validateDelivery(input);
  if (Object.keys(errors).length) return { error: "Check the highlighted fields.", fields: errors, status: 400 as const };

  const sql = await db();
  const store = await storeBySlug(input.ref);
  const commission = store && store.user_id !== session?.uid ? Math.round((cart.subtotal * store.commission_bps) / 10000) : 0;

  // Gift card: cover what it can, keep any card charge above Stripe's minimum.
  let giftUsed = 0;
  const gc = await giftCardBalance(input.giftCode);
  if (input.giftCode && !gc) return { error: "That gift card code isn't valid or has no balance.", fields: { giftCode: "Check the code." }, status: 400 as const };
  if (gc) {
    giftUsed = Math.min(gc.balance, cart.total);
    const rest = cart.total - giftUsed;
    if (rest > 0 && rest < MIN_CHARGE_NGN) giftUsed = cart.total - MIN_CHARGE_NGN;
  }
  const toPay = cart.total - giftUsed;

  const ref = "SB-" + code().toUpperCase().slice(0, 6);
  const buyer = { name: values.name, email: values.email, phone: values.phone, uid: session?.uid ?? null };
  const recipient = values.forSomeoneElse ? { name: values.recipientName, phone: values.recipientPhone, message: values.giftMessage } : null;
  await sql`insert into orders ${sql({
    id: ref, user_id: session?.uid ?? null, store_id: store?.id ?? null,
    items: sql.json(compactItems(cart.lines)), subtotal: cart.subtotal, gift_card_used: giftUsed, total_paid: toPay,
    commission, buyer: sql.json(buyer), delivery: sql.json(deliveryJson(values)), recipient: recipient ? sql.json(recipient) : null,
    installer: values.installer, status: "awaiting_payment", source: input.source === "app" ? "app" : "web",
  })}`;

  // Gift card covers everything: no card payment needed.
  if (toPay === 0) {
    const [g] = await sql`update gift_cards set balance = balance - ${giftUsed} where code = ${gc!.code} and balance >= ${giftUsed} returning code`;
    if (!g) return { error: "Gift card balance changed. Try again.", status: 409 as const };
    await markOrderPaid(ref);
    return { ref, paid: true, status: 200 as const };
  }

  const customer = session ? await customerFor(session.uid) : undefined;
  const params: Stripe.PaymentIntentCreateParams = {
    amount: toPay * 100,
    currency: "ngn",
    customer,
    receipt_email: values.email,
    description: `${ref} · ${cart.lines.length} item(s) · ${values.lga}, Lagos`,
    metadata: { kind: "order", order_ref: ref, gift_code: gc?.code ?? "", gift_used: String(giftUsed), card_nickname: clip(input.cardNickname, 40) },
    allowed_payment_method_types: ["card"],
  };

  if (input.savedCardId) {
    if (!customer || !(await ownsCard(customer, clip(input.savedCardId, 60)))) return { error: "That card is no longer saved.", status: 400 as const };
    const pi = await stripe().paymentIntents.create({ ...params, payment_method: clip(input.savedCardId, 60), confirm: true, return_url: `${origin}/checkout/success` }).catch((e: Error) => e);
    if (pi instanceof Error) return { error: pi.message, status: 402 as const };
    await sql`update orders set pi_id = ${pi.id} where id = ${ref}`;
    return { ref, id: pi.id, clientSecret: pi.client_secret, paymentStatus: pi.status, amount: toPay, status: 200 as const };
  }

  const pi = await stripe().paymentIntents.create({ ...params, ...(input.saveCard && customer ? { setup_future_usage: "off_session" as const } : {}) });
  await sql`update orders set pi_id = ${pi.id} where id = ${ref}`;
  return { ref, id: pi.id, clientSecret: pi.client_secret, amount: toPay, status: 200 as const };
}

/* ---------- payment completion ---------- */

/** Idempotent: safe to call from the success page, the app and the webhook. */
export async function finalizePayment(pi: Stripe.PaymentIntent) {
  if (pi.status !== "succeeded" && pi.status !== "processing") return { ok: false, paymentStatus: pi.status };
  const md = pi.metadata;
  if (md.kind === "contribution") return finalizeContribution(pi);
  if (md.kind === "gift_card") return finalizeGiftCard(pi);

  const sql = await db();
  const ref = md.order_ref;
  const [row] = await sql`select status from orders where id = ${ref}`;
  if (!row) return { ok: false, error: "Order not found" };
  if (row.status !== "awaiting_payment") return { ok: true, ref, already: true };

  if (md.gift_code && Number(md.gift_used) > 0) {
    await sql`update gift_cards set balance = greatest(0, balance - ${Number(md.gift_used)}) where code = ${md.gift_code}`;
  }
  const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pmId && md.card_nickname && pi.setup_future_usage) {
    await stripe().paymentMethods.update(pmId, { metadata: { nickname: md.card_nickname } }).catch(() => {});
  }
  await markOrderPaid(ref);
  return { ok: true, ref };
}

async function markOrderPaid(ref: string) {
  const sql = await db();
  const [o] = await sql`update orders set status = 'pending' where id = ${ref} and status = 'awaiting_payment' returning *`;
  if (!o) return;
  await orderNotifications(o as unknown as OrderRow);
}

type OrderRow = { id: string; items: { name: string; qty: number; price: number }[]; subtotal: number; gift_card_used: number; total_paid: number; buyer: { name: string; email: string; phone: string }; delivery: { name: string; phone: string; altPhone: string; address: string; lga: string; landmark: string; notes: string }; recipient: { name: string; phone: string; message: string } | null; installer: boolean; store_id: string | null; commission: number; pool_id: string | null };

async function orderNotifications(o: OrderRow) {
  const items = o.items.map((l) => `<tr><td style="padding:6px 0">${l.qty} × ${esc(l.name)}</td><td align="right">${naira(l.price * l.qty)}</td></tr>`).join("");
  const d = o.delivery;
  const forOther = !!o.recipient;
  await sendMail({
    to: [o.buyer.email],
    subject: `We've received your order ${o.id}`,
    html: shell(`Thank you, ${esc(o.buyer.name.split(" ")[0])}. We've got your order.`,
      `<p style="font-size:15px;line-height:1.5">Order <b>${o.id}</b> is <b>pending</b>. We'll call ${forOther ? esc(d.name) : "you"} on <b>${esc(d.phone)}</b> shortly to arrange delivery to ${esc(d.lga)}${o.installer ? " and installation" : ""}.</p>
       <table width="100%" style="font-size:14px">${items}<tr><td><b>Paid</b></td><td align="right"><b>${naira(o.total_paid)}</b></td></tr></table>`),
  });
  const text = [
    `NEW ORDER ${o.id} — ${naira(o.subtotal)}${o.gift_card_used ? ` (gift card ${naira(o.gift_card_used)})` : ""}${o.pool_id ? ` [group-funded ${o.pool_id}]` : ""}`,
    `Buyer: ${o.buyer.name} · ${o.buyer.phone} · ${o.buyer.email}`,
    forOther ? `FOR: ${o.recipient!.name} · ${o.recipient!.phone}${o.recipient!.message ? ` — "${o.recipient!.message}"` : ""}` : "",
    `Deliver: ${d.address}${d.landmark ? ` (near ${d.landmark})` : ""}, ${d.lga} · call ${d.phone}${d.altPhone ? ` / ${d.altPhone}` : ""}`,
    `Installer: ${o.installer ? "YES" : "no"}${o.store_id ? ` · referral commission ${naira(o.commission)}` : ""}`,
    ...o.items.map((l) => `- ${l.qty} x ${l.name}`),
    d.notes ? `Notes: ${d.notes}` : "",
  ].filter(Boolean).join("\n");
  await notifyOwner(text);
}

/* ---------- group funding ---------- */

export async function createContribution(poolId: string, input: { name?: string; email?: string; message?: string; amount?: number; anonymous?: boolean }) {
  const sql = await db();
  const [p] = await sql`select id, title, goal, raised, status from pools where id = ${poolId}`;
  if (!p) return { error: "This funding page doesn't exist.", status: 404 as const };
  if (p.status !== "open") return { error: "This goal has already been reached. Thank you!", status: 409 as const };
  const remaining = p.goal - p.raised;
  const amount = Math.floor(Number(input.amount) || 0);
  const email = clip(input.email, 120).toLowerCase();
  if (!isEmail(email)) return { error: "Enter your email for the receipt.", status: 400 as const };
  const min = Math.min(MIN_CHARGE_NGN, remaining);
  if (amount < min) return { error: `The smallest amount is ${naira(min)}.`, status: 400 as const };
  if (amount > remaining) return { error: `Only ${naira(remaining)} is left to reach the goal.`, status: 400 as const };
  if (remaining - amount > 0 && remaining - amount < MIN_CHARGE_NGN) return { error: `Pay ${naira(remaining)} to complete it, or leave at least ${naira(MIN_CHARGE_NGN)} for others.`, status: 400 as const };

  const cid = id();
  const pi = await stripe().paymentIntents.create({
    amount: amount * 100, currency: "ngn", receipt_email: email, allowed_payment_method_types: ["card"],
    description: `Contribution to ${p.title} (${p.id})`,
    metadata: { kind: "contribution", contribution_id: cid, pool_id: p.id },
  });
  await sql`insert into contributions ${sql({ id: cid, pool_id: p.id, name: clip(input.name, 60), email, message: clip(input.message, 200), amount, anonymous: !!input.anonymous, pi_id: pi.id })}`;
  return { id: pi.id, clientSecret: pi.client_secret, amount, status: 200 as const };
}

async function finalizeContribution(pi: Stripe.PaymentIntent) {
  const sql = await db();
  const [c] = await sql`update contributions set status = 'paid' where pi_id = ${pi.id} and status = 'pending' returning pool_id, amount, name`;
  const poolId = pi.metadata.pool_id;
  if (!c) return { ok: true, poolId, already: true };
  const [p] = await sql`update pools set raised = raised + ${c.amount} where id = ${poolId} returning *`;
  if (p && p.raised >= p.goal && p.status === "open") {
    const [funded] = await sql`update pools set status = 'funded' where id = ${poolId} and status = 'open' returning *`;
    if (funded) await placePoolOrder(funded as unknown as Parameters<typeof placePoolOrder>[0]);
  }
  return { ok: true, poolId, kind: "contribution" };
}

async function placePoolOrder(p: { id: string; user_id: string; store_id: string | null; title: string; items: { id: string; qty: number }[]; goal: number; delivery: Record<string, string> & { installer?: boolean } }) {
  const sql = await db();
  const [u] = await sql`select name, email, phone from users where id = ${p.user_id}`;
  const cart = priceCart(p.items);
  const store = p.store_id ? (await sql`select commission_bps from stores where id = ${p.store_id}`)[0] : null;
  const ref = "SB-" + code().toUpperCase().slice(0, 6);
  await sql`insert into orders ${sql({
    id: ref, user_id: p.user_id, store_id: p.store_id, pool_id: p.id, items: sql.json(compactItems(cart.lines)), subtotal: cart.subtotal,
    total_paid: p.goal, commission: store ? Math.round((cart.subtotal * store.commission_bps) / 10000) : 0,
    buyer: sql.json({ name: u?.name ?? "", email: u?.email ?? "", phone: u?.phone ?? "" }), delivery: sql.json(p.delivery),
    installer: !!p.delivery.installer, status: "awaiting_payment", source: "pool",
  })}`;
  await markOrderPaid(ref);
}

/* ---------- gift cards ---------- */

export async function startGiftCard(input: { amount?: number; fromName?: string; fromEmail?: string; toName?: string; toEmail?: string; message?: string }) {
  const amount = Math.floor(Number(input.amount) || 0);
  if (amount < 10_000 || amount > 5_000_000) return { error: "Gift cards are from ₦10,000 to ₦5,000,000.", status: 400 as const };
  const fromEmail = clip(input.fromEmail, 120).toLowerCase();
  if (!isEmail(fromEmail)) return { error: "Enter your email.", fields: { fromEmail: "Enter a valid email." }, status: 400 as const };
  const toEmail = clip(input.toEmail, 120).toLowerCase();
  if (toEmail && !isEmail(toEmail)) return { error: "Check the recipient's email.", fields: { toEmail: "Enter a valid email or leave it empty." }, status: 400 as const };
  const giftCode = ("SG" + code() + code()).toUpperCase().slice(0, 12);
  const pi = await stripe().paymentIntents.create({
    amount: amount * 100, currency: "ngn", receipt_email: fromEmail, allowed_payment_method_types: ["card"],
    description: `Solar gift card ${naira(amount)}`, metadata: { kind: "gift_card", gift_code: giftCode },
  });
  const sql = await db();
  await sql`insert into gift_cards ${sql({ code: giftCode, amount, balance: amount, from_name: clip(input.fromName, 60), from_email: fromEmail, to_name: clip(input.toName, 60), to_email: toEmail, message: clip(input.message, 300), pi_id: pi.id })}`;
  return { id: pi.id, clientSecret: pi.client_secret, amount, status: 200 as const };
}

async function finalizeGiftCard(pi: Stripe.PaymentIntent) {
  const sql = await db();
  const [g] = await sql`update gift_cards set status = 'active' where pi_id = ${pi.id} and status = 'pending' returning *`;
  if (!g) {
    const [cur] = await sql`select code, amount, to_name from gift_cards where pi_id = ${pi.id}`;
    return { ok: true, kind: "gift_card", code: cur?.code, amount: cur?.amount, already: true };
  }
  const body = `<p style="font-size:15px">${esc(g.from_name || "Someone")} sent ${esc(g.to_name || "you")} a <b>${naira(g.amount)}</b> Solar Builders gift card.</p>${g.message ? `<p style="font-style:italic">“${esc(g.message)}”</p>` : ""}<p style="font-size:26px;letter-spacing:3px;font-weight:bold">${g.code}</p><p>Use it at checkout on ${STORE.url}.</p>`;
  await sendMail({ to: [g.to_email, g.from_email], subject: `A ${naira(g.amount)} solar gift card for ${g.to_name || "you"}`, html: shell("You've got a solar gift card", body) });
  await notifyOwner(`GIFT CARD ${g.code} sold — ${naira(g.amount)} from ${g.from_name} <${g.from_email}> to ${g.to_name} <${g.to_email}>`);
  return { ok: true, kind: "gift_card", code: g.code, amount: g.amount };
}

export { brandName };
