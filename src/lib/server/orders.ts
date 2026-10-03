import "server-only";
import type Stripe from "stripe";
import { STORE, type OrderStatus, FULFILMENT, ORDER_STATUS } from "@/config/store";
import { naira, ngE164, isEmail, isName, firstName } from "@/lib/format";
import { db, id, type Tx } from "./db";
import { str, int, bool, HttpError } from "./api";
import { stripe, customerFor, ownsCard, MIN_CHARGE_NGN, refund } from "./stripe";
import { sendMail, shell, esc, notifyOwner } from "./mail";
import { priceCart, checkCart, compactItems, validateDelivery, deliveryJson, assertValid, type CartLine, type DeliveryInput } from "./rules";
import { ledger, insertOrder, type OrderRow } from "./ledger";
import type { Session } from "./session";

/* ---------- stores & referrals ---------- */

export async function storeBySlug(slug: unknown) {
  const s = str(slug, 40).toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(s)) return null;
  const sql = await db();
  const [row] = await sql`select s.id, s.user_id, s.slug, s.name, s.commission_bps, u.email as owner_email, u.phone as owner_phone
    from stores s join users u on u.id = s.user_id where s.slug = ${s}`;
  return row ?? null;
}

/** 0.5% (by default) to the seller whose link brought the buyer, never on their own purchases. */
function commissionFor(store: Awaited<ReturnType<typeof storeBySlug>>, subtotal: number, buyer: { uid?: string | null; email?: string; phone?: string }) {
  if (!store) return 0;
  const self = store.user_id === buyer.uid || (buyer.email && store.owner_email === buyer.email) || (buyer.phone && store.owner_phone && ngE164(store.owner_phone) === ngE164(buyer.phone));
  return self ? 0 : Math.round((subtotal * store.commission_bps) / 10000);
}

/* ---------- gift cards ---------- */

export const normalizeGiftCode = (c: unknown) => str(c, 30).toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function giftCardBalance(c: unknown) {
  const k = normalizeGiftCode(c);
  if (!/^SG[A-Z0-9]{6,16}$/.test(k)) return null;
  await sweepStaleOrders({ giftCode: k });
  const sql = await db();
  const [g] = await sql`select code, balance, status from gift_cards where code = ${k}`;
  return g && g.status === "active" && g.balance > 0 ? { code: g.code as string, balance: g.balance as number } : null;
}

/** How much of the total a gift card covers, keeping any card charge above Stripe's minimum. */
function giftSplit(total: number, balance: number) {
  let used = Math.min(balance, total);
  const rest = total - used;
  if (rest > 0 && rest < MIN_CHARGE_NGN) used = Math.max(0, total - MIN_CHARGE_NGN);
  return { giftUsed: used, toPay: total - used };
}

export async function startGiftCard(input: Record<string, unknown>) {
  const amount = int(input.amount);
  if (amount < 10_000 || amount > 5_000_000) throw new HttpError(400, "Gift cards are from ₦10,000 to ₦5,000,000.", { fields: { amount: "From ₦10,000 to ₦5,000,000." } });
  const v = {
    fromName: str(input.fromName, 60), fromEmail: str(input.fromEmail, 120).toLowerCase(),
    toName: str(input.toName, 60), toEmail: str(input.toEmail, 120).toLowerCase(), message: str(input.message, 300),
  };
  const errors: Record<string, string> = {};
  if (!isName(v.fromName)) errors.fromName = "Enter your name.";
  if (!isEmail(v.fromEmail)) errors.fromEmail = "Enter a valid email.";
  if (v.toName && !isName(v.toName)) errors.toName = "Enter their name or leave it empty.";
  if (v.toEmail && !isEmail(v.toEmail)) errors.toEmail = "Enter a valid email or leave it empty.";
  assertValid(errors);
  const giftCode = ("SG" + id().toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const pi = await stripe().paymentIntents.create({
    amount: amount * 100, currency: "ngn", receipt_email: v.fromEmail, allowed_payment_method_types: ["card"],
    description: `Solar gift card ${naira(amount)}`, metadata: { kind: "gift_card", gift_code: giftCode },
  });
  const sql = await db();
  try {
    await sql`insert into gift_cards ${sql({ code: giftCode, amount, balance: amount, from_name: v.fromName, from_email: v.fromEmail, to_name: v.toName, to_email: v.toEmail, message: v.message, pi_id: pi.id })}`;
  } catch (e) {
    await stripe().paymentIntents.cancel(pi.id).catch(() => {});
    throw e;
  }
  return { id: pi.id, clientSecret: pi.client_secret, amount };
}

export async function finalizeGiftCard(pi: Stripe.PaymentIntent) {
  const sql = await db();
  const g = await sql.begin(async (tx) => {
    const [g] = await tx`update gift_cards set status = 'active' where pi_id = ${pi.id} and status = 'pending' returning *`;
    if (!g) return null;
    await ledger(tx, "payment", pi.amount_received / 100, g.code, pi.id, "gift card bought");
    await ledger(tx, "gift_issued", g.amount, g.code, pi.id);
    return g;
  });
  if (!g) {
    const [cur] = await sql`select code, amount from gift_cards where pi_id = ${pi.id}`;
    return { ok: true, kind: "gift_card", code: cur?.code as string | undefined, amount: cur?.amount as number | undefined, already: true };
  }
  const body = `<p style="font-size:15px">${esc(g.from_name || "Someone")} sent ${esc(g.to_name || "you")} a <b>${naira(g.amount)}</b> Solar Builders gift card.</p>${g.message ? `<p style="font-style:italic">“${esc(g.message)}”</p>` : ""}<p style="font-size:26px;letter-spacing:3px;font-weight:bold">${g.code}</p><p>Use it at checkout on ${STORE.url}. It never expires and can't be exchanged for cash.</p>`;
  await sendMail({ to: [g.to_email, g.from_email], subject: `A ${naira(g.amount)} solar gift card for ${g.to_name || "you"}`, html: shell("You've got a solar gift card", body) });
  await notifyOwner(`GIFT CARD ${g.code} sold — ${naira(g.amount)} from ${g.from_name} (${g.from_email})${g.to_name || g.to_email ? ` to ${[g.to_name, g.to_email].filter(Boolean).join(", ")}` : ""}`);
  return { ok: true, kind: "gift_card", code: g.code as string, amount: g.amount as number };
}

/** A gift card we create ourselves, e.g. for money left over in a pool. Never cash. */
export async function issueGiftCard(tx: Tx, amount: number, to: { name: string; email: string }, message: string, ref: string) {
  const giftCode = ("SG" + id().toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 12);
  await tx`insert into gift_cards ${tx({ code: giftCode, amount, balance: amount, from_name: STORE.name, from_email: "", to_name: to.name, to_email: to.email, message, status: "active" })}`;
  await ledger(tx, "gift_issued", amount, giftCode, null, `from ${ref}`);
  return giftCode;
}

/* ---------- checkout ---------- */

export type CheckoutInput = DeliveryInput & {
  items: CartLine[]; ref?: string; giftCode?: string; leadId?: string; expectedTotal?: number;
  saveCard?: boolean; cardNickname?: string; savedCardId?: string; source?: string;
};

export async function startCheckout(input: Partial<Record<keyof CheckoutInput, unknown>>, user: Session | null, origin: string) {
  const cart = priceCart(input.items);
  checkCart(cart);
  const { values, errors } = validateDelivery(input);
  assertValid(errors);

  const store = await storeBySlug(input.ref);
  const commission = commissionFor(store, cart.subtotal, { uid: user?.uid, email: values.email, phone: values.phone });

  let gift: { code: string; balance: number } | null = null;
  if (str(input.giftCode, 30)) {
    gift = await giftCardBalance(input.giftCode);
    if (!gift) throw new HttpError(400, "That gift card code isn't valid or has no balance.", { fields: { giftCode: "Check the code." } });
  }
  const { giftUsed, toPay } = giftSplit(cart.total, gift?.balance ?? 0);
  // The page shows a total before the shopper taps Pay; never charge a different one.
  if (input.expectedTotal !== undefined && int(input.expectedTotal) !== toPay) {
    throw new HttpError(409, `The total is now ${naira(toPay)}. Check it and tap Pay again.`, { amount: toPay, code: "amount_changed" });
  }

  const sql = await db();
  const leadId = str(input.leadId, 20) || null;
  const row = {
    user_id: user?.uid ?? null, store_id: store?.id ?? null, lead_id: leadId,
    items: sql.json(compactItems(cart.lines)), subtotal: cart.subtotal, gift_card_used: giftUsed, gift_code: gift?.code ?? null,
    total_paid: toPay, commission,
    buyer: sql.json({ name: values.name, email: values.email, phone: values.phone }),
    delivery: sql.json(deliveryJson(values)),
    recipient: values.forSomeoneElse ? sql.json({ name: values.recipientName, phone: values.recipientPhone, message: values.giftMessage }) : null,
    installer: values.installer, source: input.source === "app" ? "app" : "web",
  };

  const holdGift = async (tx: Tx, ref: string) => {
    if (!giftUsed) return;
    const [g] = await tx`update gift_cards set balance = balance - ${giftUsed} where code = ${gift!.code} and status = 'active' and balance >= ${giftUsed} returning code`;
    if (!g) throw new HttpError(409, "Your gift card balance changed. Apply it again.", { fields: { giftCode: "Apply the code again." }, code: "gift_changed" });
    await ledger(tx, "gift_hold", giftUsed, ref, null, gift!.code);
  };

  // A gift card covers it all: no card payment.
  if (toPay === 0) {
    const o = await sql.begin(async (tx) => {
      const o = await insertOrder(tx, { ...row, status: "pending" });
      await holdGift(tx, o.id);
      if (leadId) await tx`update leads set order_id = ${o.id}, updated_at = now() where id = ${leadId}`;
      return o;
    });
    await orderNotifications(o);
    return { ref: o.id, paid: true, amount: 0 };
  }

  const customer = user ? await customerFor(user.uid) : undefined;
  const savedCardId = str(input.savedCardId, 60);
  if (savedCardId && (!customer || !(await ownsCard(customer, savedCardId)))) throw new HttpError(400, "That card is no longer saved. Pick another.");
  const saveCard = bool(input.saveCard) && !!customer && !savedCardId;

  const pi = await stripe().paymentIntents.create({
    amount: toPay * 100,
    currency: "ngn",
    customer,
    receipt_email: values.email,
    description: `Solar Builders order · ${cart.lines.length} item(s) · ${values.lga}, Lagos`,
    metadata: { kind: "order", card_nickname: saveCard ? str(input.cardNickname, 40) : "" },
    allowed_payment_method_types: ["card"],
    ...(saveCard ? { setup_future_usage: "off_session" as const } : {}),
  });

  let order: OrderRow;
  try {
    order = await sql.begin(async (tx) => {
      const o = await insertOrder(tx, { ...row, pi_id: pi.id, status: "awaiting_payment" });
      await holdGift(tx, o.id);
      return o;
    });
  } catch (e) {
    await stripe().paymentIntents.cancel(pi.id).catch(() => {});
    throw e;
  }
  await stripe().paymentIntents.update(pi.id, { metadata: { order_ref: order.id }, description: `${order.id} · ${cart.lines.length} item(s) · ${values.lga}, Lagos` });

  if (savedCardId) {
    const done = await stripe().paymentIntents.confirm(pi.id, { payment_method: savedCardId, return_url: `${origin}/checkout/success` }).catch((e: Error) => e);
    if (done instanceof Error) {
      await cancelAwaiting(order.id, "card declined");
      throw new HttpError(402, done.message || "Your card was declined. Try another card.");
    }
    return { ref: order.id, id: pi.id, clientSecret: pi.client_secret, paymentStatus: done.status, amount: toPay };
  }
  return { ref: order.id, id: pi.id, clientSecret: pi.client_secret, paymentStatus: pi.status, amount: toPay };
}

/** Called when a card payment fails in the browser, so the gift card hold is returned at once. */
export async function abandonPayment(piId: string, clientSecret: string) {
  const pi = await stripe().paymentIntents.retrieve(piId).catch(() => null);
  if (!pi || pi.client_secret !== clientSecret || pi.metadata.kind !== "order") return { ok: false };
  if (pi.status === "succeeded" || pi.status === "processing") return { ok: false, paymentStatus: pi.status };
  const sql = await db();
  const [o] = await sql`select id from orders where pi_id = ${pi.id} and status = 'awaiting_payment'`;
  if (o) await cancelAwaiting(o.id, "payment abandoned");
  return { ok: true };
}

/**
 * Cancels an unpaid order: cancels its Stripe payment (if Stripe still allows it) and returns
 * any gift card hold. If the payment went through after all, the order is completed instead.
 */
export async function cancelAwaiting(ref: string, why: string) {
  const sql = await db();
  const [o] = await sql`select id, pi_id, status from orders where id = ${ref}`;
  if (!o || o.status !== "awaiting_payment") return;
  if (o.pi_id) {
    const res = await stripe().paymentIntents.cancel(o.pi_id).catch((e: Error) => e);
    if (res instanceof Error) {
      const pi = await stripe().paymentIntents.retrieve(o.pi_id).catch(() => null);
      if (pi?.status === "succeeded") await finalizeOrder(pi);
      if (pi?.status !== "canceled") return;
    }
  }
  await sql.begin(async (tx) => {
    const [x] = await tx`update orders set status = 'expired', status_at = now() where id = ${ref} and status = 'awaiting_payment' returning gift_code, gift_card_used`;
    if (x?.gift_code && x.gift_card_used > 0) {
      await tx`update gift_cards set balance = balance + ${x.gift_card_used} where code = ${x.gift_code}`;
      await ledger(tx, "gift_release", x.gift_card_used, ref, o.pi_id, `${x.gift_code} · ${why}`);
    }
  });
}

/** Unpaid orders older than 30 minutes are cancelled. Scoped to one gift card when one is about to be used. */
export async function sweepStaleOrders(scope: { giftCode?: string } = {}) {
  const sql = await db();
  const stale = scope.giftCode
    ? await sql`select id from orders where status = 'awaiting_payment' and gift_code = ${scope.giftCode} and created_at < now() - interval '30 minutes' limit 20`
    : await sql`select id from orders where status = 'awaiting_payment' and created_at < now() - interval '30 minutes' order by created_at limit 100`;
  for (const o of stale) await cancelAwaiting(o.id, "not paid within 30 minutes").catch((e) => console.error("[sweep]", o.id, e));
  return stale.length;
}

/* ---------- completing an order ---------- */

export async function finalizeOrder(pi: Stripe.PaymentIntent) {
  const sql = await db();
  const ref = pi.metadata.order_ref || ((await sql`select id from orders where pi_id = ${pi.id}`)[0]?.id as string | undefined);
  if (!ref) return { ok: false, error: "Order not found" };
  const o = await sql.begin(async (tx) => {
    const [o] = await tx`update orders set status = 'pending', status_at = now() where id = ${ref} and pi_id = ${pi.id} and status = 'awaiting_payment' returning *`;
    if (!o) return null;
    await ledger(tx, "payment", pi.amount_received / 100, ref, pi.id, "order");
    if (o.lead_id) await tx`update leads set order_id = ${ref}, updated_at = now() where id = ${o.lead_id}`;
    return o as unknown as OrderRow;
  });
  if (!o) {
    const [cur] = await sql`select status from orders where id = ${ref}`;
    // Paid after we had given up on it: send the money back rather than keep it.
    if (cur?.status === "expired") {
      await refund(pi.id, undefined, "order had expired before payment completed").catch((e) => console.error("[refund]", e));
      await sql`update orders set status = 'refunded', refunded = total_paid, status_at = now() where id = ${ref}`;
      await sql.begin((tx) => ledger(tx, "refund", pi.amount_received / 100, ref, pi.id, "paid after expiry"));
      return { ok: false, ref, error: "This order had expired, so the payment was refunded." };
    }
    return { ok: true, ref, already: true };
  }
  const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pmId && pi.metadata.card_nickname && pi.setup_future_usage) {
    await stripe().paymentMethods.update(pmId, { metadata: { nickname: pi.metadata.card_nickname } }).catch(() => {});
  }
  await orderNotifications(o);
  return { ok: true, ref };
}

export async function orderNotifications(o: OrderRow) {
  const items = o.items.map((l) => `<tr><td style="padding:6px 0">${l.qty} × ${esc(l.name)}</td><td align="right">${naira(l.price * l.qty)}</td></tr>`).join("");
  const d = o.delivery;
  const forOther = !!o.recipient;
  await sendMail({
    to: [o.buyer.email],
    subject: `We've received your order ${o.id}`,
    html: shell(`Thank you, ${esc(firstName(o.buyer.name))}. We've got your order.`,
      `<p style="font-size:15px;line-height:1.5">Order <b>${o.id}</b> is <b>pending</b>. We'll call ${forOther ? esc(d.name) : "you"} on <b>${esc(d.phone)}</b> shortly to arrange delivery to ${esc(d.lga)}${o.installer ? " and installation" : ""}.</p>
       <table width="100%" style="font-size:14px">${items}<tr><td><b>Paid</b></td><td align="right"><b>${naira(o.total_paid + o.gift_card_used)}</b></td></tr></table>`),
  });
  const text = [
    `NEW ORDER ${o.id} — ${naira(o.subtotal)}${o.gift_card_used ? ` (gift card ${naira(o.gift_card_used)})` : ""}${o.pool_id ? ` [Go Solar Me ${o.pool_id}]` : ""}`,
    `Buyer: ${o.buyer.name} · ${o.buyer.phone || "no phone"} · ${o.buyer.email}`,
    forOther ? `FOR: ${o.recipient!.name} · ${o.recipient!.phone}${o.recipient!.message ? ` — "${o.recipient!.message}"` : ""}` : "",
    d.address ? `Deliver: ${d.address}${d.landmark ? ` (near ${d.landmark})` : ""}, ${d.lga} · call ${d.phone}${d.altPhone ? ` / ${d.altPhone}` : ""}` : `ADDRESS NEEDED · ${d.lga} · call ${d.phone}`,
    `Installer: ${o.installer ? "YES" : "no"}${o.commission ? ` · referral commission ${naira(o.commission)}` : ""}`,
    ...o.items.map((l) => `- ${l.qty} x ${l.name}`),
    d.notes ? `Notes: ${d.notes}` : "",
  ].filter(Boolean).join("\n");
  await notifyOwner(text);
}

/* ---------- after the sale ---------- */

export async function setOrderStatus(ref: string, status: string) {
  if (!FULFILMENT.includes(status as OrderStatus)) throw new HttpError(400, "Unknown status.");
  const sql = await db();
  const [o] = await sql`update orders set status = ${status}, status_at = now() where id = ${ref} and status = any(${FULFILMENT}) returning id, status`;
  if (!o) throw new HttpError(409, "Only paid, active orders can change status.");
  return { ref: o.id, status: o.status, label: ORDER_STATUS[o.status as OrderStatus] };
}

/**
 * Refunds an order in full: card money back to the card, gift card value back to the gift card,
 * and for a Go Solar Me order, every supporter back to their own card.
 */
export async function refundOrder(ref: string, reason: string) {
  const sql = await db();
  const [o] = await sql`update orders set status = 'cancelled', status_at = now() where id = ${ref} and status = any(${FULFILMENT}) returning *`;
  if (!o) throw new HttpError(409, "Only paid, active orders can be refunded.");
  const order = o as unknown as OrderRow;
  const results: string[] = [];
  if (order.pool_id) {
    const paid = await sql`select id, pi_id, amount from contributions where pool_id = ${order.pool_id} and status = 'paid' and amount > 0`;
    for (const c of paid) {
      const r = await refund(c.pi_id, c.amount, `order ${ref}: ${reason}`).catch((e: Error) => e);
      if (r instanceof Error) { results.push(`failed ${c.id}: ${r.message}`); continue; }
      await sql.begin(async (tx) => {
        await tx`update contributions set status = 'refunded', refunded = refunded + amount where id = ${c.id}`;
        await ledger(tx, "refund", c.amount, order.pool_id!, c.pi_id, `order ${ref}`);
      });
    }
    await sql`update pools set status = 'cancelled' where id = ${order.pool_id}`;
  } else if (order.pi_id && order.total_paid > 0) {
    const r = await refund(order.pi_id, undefined, reason).catch((e: Error) => e);
    if (r instanceof Error) results.push(`card refund failed: ${r.message}`);
    else await sql.begin((tx) => ledger(tx, "refund", order.total_paid, ref, order.pi_id, reason));
  }
  if (order.gift_code && order.gift_card_used > 0) {
    await sql.begin(async (tx) => {
      await tx`update gift_cards set balance = balance + ${order.gift_card_used} where code = ${order.gift_code}`;
      await ledger(tx, "gift_release", order.gift_card_used, ref, null, `${order.gift_code} · refund`);
    });
  }
  const failed = results.length > 0;
  await sql`update orders set status = ${failed ? "cancelled" : "refunded"}, refunded = ${failed ? 0 : order.total_paid}, status_at = now() where id = ${ref}`;
  await notifyOwner(`REFUND ${ref}${failed ? " — NEEDS ATTENTION\n" + results.join("\n") : " done"} (${reason})`);
  return { ref, refunded: !failed, problems: results };
}
