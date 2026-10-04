import "server-only";
import { STORE, type OrderStatus, FULFILMENT, ORDER_STATUS } from "@/config/store";
import { naira, ngE164, isEmail, isName, firstName } from "@/lib/format";
import { db, id, type Tx } from "./db";
import { str, int, bool, HttpError } from "./api";
import { stripe, customerFor, ownsCard } from "./stripe";
import { MIN_CHARGE_NGN, pickProvider, providerOf, fetchPayment, refundPayment, startPaystack, savePaystackCard, paystackCard, chargePaystackCard, type Paid } from "./pay";
import { newPaystackRef } from "./paystack";
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

export async function startGiftCard(input: Record<string, unknown>, origin?: string) {
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
  const provider = pickProvider(input.provider);
  const giftCode = ("SG" + id().toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const sql = await db();
  const row = { code: giftCode, amount, balance: amount, from_name: v.fromName, from_email: v.fromEmail, to_name: v.toName, to_email: v.toEmail, message: v.message };
  const metadata = { kind: "gift_card", gift_code: giftCode };

  if (provider === "paystack") {
    const ref = newPaystackRef();
    await sql`insert into gift_cards ${sql({ ...row, pi_id: ref })}`;
    const ps = await startPaystack({ email: v.fromEmail, amountNgn: amount, metadata, origin, reference: ref, cancelPath: "/gift-cards" }).catch(async (e) => {
      await sql`delete from gift_cards where pi_id = ${ref} and status = 'pending'`;
      throw e;
    });
    return { provider, id: ps.ref, authorizationUrl: ps.authorizationUrl, amount };
  }

  const pi = await stripe().paymentIntents.create({
    amount: amount * 100, currency: "ngn", receipt_email: v.fromEmail, allowed_payment_method_types: ["card"],
    description: `Solar gift card ${naira(amount)}`, metadata,
  });
  try {
    await sql`insert into gift_cards ${sql({ ...row, pi_id: pi.id })}`;
  } catch (e) {
    await stripe().paymentIntents.cancel(pi.id).catch(() => {});
    throw e;
  }
  return { provider, id: pi.id, clientSecret: pi.client_secret, amount };
}

export async function finalizeGiftCard(p: Paid) {
  const sql = await db();
  const g = await sql.begin(async (tx) => {
    // The amount check means a payment can only ever activate a card it fully paid for.
    const [g] = await tx`update gift_cards set status = 'active' where pi_id = ${p.ref} and status = 'pending' and amount <= ${p.amount} returning *`;
    if (!g) return null;
    await ledger(tx, "payment", p.amount, g.code, p.ref, "gift card bought");
    await ledger(tx, "gift_issued", g.amount, g.code, p.ref);
    return g;
  });
  if (!g) {
    const [cur] = await sql`select code, amount from gift_cards where pi_id = ${p.ref}`;
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
  saveCard?: boolean; cardNickname?: string; savedCardId?: string; source?: string; provider?: "paystack" | "stripe";
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

  const savedCardId = str(input.savedCardId, 60);
  // A saved card decides the provider; otherwise the buyer's choice, naira first.
  const provider = savedCardId ? (savedCardId.startsWith("pc_") ? "paystack" : "stripe") : pickProvider(input.provider);
  if (provider === "paystack") return startPaystackCheckout({ row, holdGift, toPay, values, lines: cart.lines.length, user, savedCardId, saveCard: bool(input.saveCard), cardNickname: str(input.cardNickname, 40), origin });

  const customer = user ? await customerFor(user.uid) : undefined;
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
    return { provider, ref: order.id, id: pi.id, clientSecret: pi.client_secret, paymentStatus: done.status, amount: toPay };
  }
  return { provider, ref: order.id, id: pi.id, clientSecret: pi.client_secret, paymentStatus: pi.status, amount: toPay };
}

/**
 * Naira checkout. The order and any gift card hold are saved first under our own reference,
 * then the buyer goes to Paystack's page (or a saved card is charged directly).
 */
async function startPaystackCheckout(o: {
  row: Record<string, unknown>; holdGift: (tx: Tx, ref: string) => Promise<void>; toPay: number; values: { email: string; lga: string };
  lines: number; user: Session | null; savedCardId: string; saveCard: boolean; cardNickname: string; origin: string;
}) {
  const card = o.savedCardId ? (o.user ? await paystackCard(o.user.uid, o.savedCardId) : null) : null;
  if (o.savedCardId && !card) throw new HttpError(400, "That card is no longer saved. Pick another.");
  const sql = await db();
  const psRef = newPaystackRef();
  const order = await sql.begin(async (tx) => {
    const x = await insertOrder(tx, { ...o.row, pi_id: psRef, status: "awaiting_payment" });
    await o.holdGift(tx, x.id);
    return x;
  });
  const metadata: Record<string, string> = {
    kind: "order", order_ref: order.id,
    ...(o.user && o.saveCard && !card ? { save_card: "1", user_id: o.user.uid, card_nickname: o.cardNickname } : {}),
  };

  if (card) {
    const p = await chargePaystackCard(card, o.toPay, psRef, metadata).catch(async (e) => { await cancelAwaiting(order.id, "card charge error"); throw e; });
    if (p.status === "succeeded") {
      await finalizeOrder(p);
      return { provider: "paystack" as const, ref: order.id, id: psRef, paymentStatus: "succeeded", amount: o.toPay };
    }
    if (p.authorizationUrl) return { provider: "paystack" as const, ref: order.id, id: psRef, paymentStatus: "requires_action", authorizationUrl: p.authorizationUrl, amount: o.toPay };
    if (p.status === "processing") return { provider: "paystack" as const, ref: order.id, id: psRef, paymentStatus: "processing", amount: o.toPay };
    await cancelAwaiting(order.id, "card declined");
    throw new HttpError(402, "Your bank declined that card. Try another card, or pay by transfer.");
  }

  try {
    const ps = await startPaystack({ email: o.values.email, amountNgn: o.toPay, metadata, origin: o.origin, reference: psRef });
    return { provider: "paystack" as const, ref: order.id, id: psRef, authorizationUrl: ps.authorizationUrl, paymentStatus: "requires_action", amount: o.toPay };
  } catch (e) {
    await cancelAwaiting(order.id, "payment page failed to open");
    throw e;
  }
}

/**
 * Called when a payment fails or is cancelled in the browser, so the gift card hold is returned at once.
 * Stripe needs the payment's client secret; a Paystack reference is itself unguessable.
 */
export async function abandonPayment(ref: string, clientSecret: string) {
  const p = await fetchPayment(ref);
  if (!p || p.metadata.kind !== "order") return { ok: false };
  if (p.provider === "stripe" && p.clientSecret !== clientSecret) return { ok: false };
  // A Paystack transfer can sit "pending" while the bank confirms; only give up on a clear failure.
  if (p.provider === "paystack" ? p.status !== "canceled" && p.status !== "failed" : p.status === "succeeded" || p.status === "processing") return { ok: false, paymentStatus: p.status };
  const sql = await db();
  const [o] = await sql`select id from orders where pi_id = ${p.ref} and status = 'awaiting_payment'`;
  if (o) await cancelAwaiting(o.id, "payment abandoned");
  return { ok: true };
}

/**
 * Cancels an unpaid order and returns any gift card hold. A Stripe payment is cancelled too; a Paystack
 * one can't be, so if it is paid later the money is refunded (see finalizeOrder). If the payment went
 * through after all, the order is completed instead.
 */
export async function cancelAwaiting(ref: string, why: string) {
  const sql = await db();
  const [o] = await sql`select id, pi_id, status from orders where id = ${ref}`;
  if (!o || o.status !== "awaiting_payment") return;
  if (o.pi_id && providerOf(o.pi_id) === "stripe") {
    const res = await stripe().paymentIntents.cancel(o.pi_id).catch((e: Error) => e);
    if (res instanceof Error) {
      const p = await fetchPayment(o.pi_id);
      if (p?.status === "succeeded") await finalizeOrder(p);
      if (p?.status !== "canceled") return;
    }
  } else if (o.pi_id) {
    const p = await fetchPayment(o.pi_id);
    if (p?.status === "succeeded") { await finalizeOrder(p); return; }
    if (p?.status === "processing") return;
  }
  await sql.begin(async (tx) => {
    const [x] = await tx`update orders set status = 'expired', status_at = now() where id = ${ref} and status = 'awaiting_payment' returning gift_code, gift_card_used`;
    if (x?.gift_code && x.gift_card_used > 0) {
      await tx`update gift_cards set balance = balance + ${x.gift_card_used} where code = ${x.gift_code}`;
      await ledger(tx, "gift_release", x.gift_card_used, ref, o.pi_id, `${x.gift_code} · ${why}`);
    }
  });
}

/**
 * Unpaid orders are cancelled after 30 minutes (Stripe) or 60 minutes (Paystack, where bank transfers
 * take longer). Scoped to one gift card when one is about to be used.
 */
export async function sweepStaleOrders(scope: { giftCode?: string } = {}) {
  const sql = await db();
  const age = sql`created_at < now() - case when pi_id like 'ps\_%' then interval '60 minutes' else interval '30 minutes' end`;
  const stale = scope.giftCode
    ? await sql`select id from orders where status = 'awaiting_payment' and gift_code = ${scope.giftCode} and ${age} limit 20`
    : await sql`select id from orders where status = 'awaiting_payment' and ${age} order by created_at limit 100`;
  for (const o of stale) await cancelAwaiting(o.id, "not paid in time").catch((e) => console.error("[sweep]", o.id, e));
  return stale.length;
}

/* ---------- completing an order ---------- */

export async function finalizeOrder(p: Paid) {
  const sql = await db();
  const ref = p.metadata.order_ref || ((await sql`select id from orders where pi_id = ${p.ref}`)[0]?.id as string | undefined);
  if (!ref) return { ok: false, error: "Order not found" };
  const o = await sql.begin(async (tx) => {
    // Matched on our own payment reference and the full amount, so no other payment can complete this order.
    const [cur] = await tx`select status, gift_code, gift_card_used from orders where id = ${ref} and pi_id = ${p.ref} and total_paid <= ${p.amount} for update`;
    if (!cur || (cur.status !== "awaiting_payment" && cur.status !== "expired")) return null;
    if (cur.status === "expired" && cur.gift_code && cur.gift_card_used > 0) {
      // Paid after the order lapsed: its gift card hold went back, so take it again or refund instead.
      const [g] = await tx`update gift_cards set balance = balance - ${cur.gift_card_used} where code = ${cur.gift_code} and status = 'active' and balance >= ${cur.gift_card_used} returning code`;
      if (!g) return null;
      await ledger(tx, "gift_hold", cur.gift_card_used, ref, null, `${cur.gift_code} · paid late`);
    }
    const [o] = await tx`update orders set status = 'pending', status_at = now() where id = ${ref} returning *`;
    await ledger(tx, "payment", p.amount, ref, p.ref, cur.status === "expired" ? "order, paid late" : "order");
    if (o.lead_id) await tx`update leads set order_id = ${ref}, updated_at = now() where id = ${o.lead_id}`;
    return o as unknown as OrderRow;
  });
  if (!o) {
    const [cur] = await sql`select status, pi_id, total_paid from orders where id = ${ref}`;
    if (cur?.pi_id !== p.ref) return { ok: false, error: "Order not found" };
    // Paid late and the gift card balance is gone: send the money back rather than keep it.
    if (cur.status === "expired") {
      const [x] = await sql`update orders set status = 'refunded', refunded = total_paid, status_at = now() where id = ${ref} and status = 'expired' returning id`;
      if (x) {
        const r = await refundPayment(p.ref, undefined, "order had expired before payment completed").catch((e: Error) => e);
        if (r instanceof Error) await notifyOwner(`REFUND FAILED for late payment on expired order ${ref} (${naira(p.amount)}): ${r.message}`);
        else {
          await sql.begin((tx) => ledger(tx, "refund", p.amount, ref, p.ref, "paid after expiry"));
          await notifyOwner(`LATE PAYMENT REFUNDED for expired order ${ref} (${naira(p.amount)}): its gift card balance had been used.`);
        }
      }
      return { ok: false, ref, error: "This order had expired, so the payment was refunded." };
    }
    if (cur.status === "refunded") return { ok: false, ref, error: "This payment was refunded." };
    if (cur.status === "awaiting_payment") {
      await notifyOwner(`PAYMENT AMOUNT MISMATCH on ${ref}: got ${naira(p.amount)}, order is ${naira(cur.total_paid)}. Check ${p.ref}.`);
      return { ok: false, ref, error: "The amount paid doesn't match this order. We'll contact you." };
    }
    return { ok: true, ref, already: true };
  }
  if (p.stripe) {
    const pi = p.stripe;
    const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
    if (pmId && pi.metadata.card_nickname && pi.setup_future_usage) {
      await stripe().paymentMethods.update(pmId, { metadata: { nickname: pi.metadata.card_nickname } }).catch(() => {});
    }
  } else if (p.metadata.save_card === "1" && p.metadata.user_id && p.metadata.user_id === o.user_id) {
    await savePaystackCard(p, p.metadata.user_id, p.metadata.card_nickname || "").catch((e) => console.error("[save card]", e));
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
      const r = await refundPayment(c.pi_id, c.amount, `order ${ref}: ${reason}`).catch((e: Error) => e);
      if (r instanceof Error) { results.push(`failed ${c.id}: ${r.message}`); continue; }
      await sql.begin(async (tx) => {
        await tx`update contributions set status = 'refunded', refunded = refunded + amount where id = ${c.id}`;
        await ledger(tx, "refund", c.amount, order.pool_id!, c.pi_id, `order ${ref}`);
      });
    }
    await sql`update pools set status = 'cancelled' where id = ${order.pool_id}`;
  } else if (order.pi_id && order.total_paid > 0) {
    const r = await refundPayment(order.pi_id, undefined, reason).catch((e: Error) => e);
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
