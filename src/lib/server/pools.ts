import "server-only";
import { getProductById } from "@/lib/catalog";
import { LAGOS_LGAS, OCCASIONS, POOL } from "@/config/store";
import { NG_PHONE, normalizePhone, ngE164, isEmail, isName, naira, firstName } from "@/lib/format";
import { db, code, id, type Tx } from "./db";
import { str, int, bool, oneOf, HttpError } from "./api";
import { stripe } from "./stripe";
import { MIN_CHARGE_NGN, pickProvider, providerOf, fetchPayment, refundPayment, startPaystack, type Paid } from "./pay";
import { newPaystackRef } from "./paystack";
import { notifyOwner } from "./mail";
import { pushTo } from "./push";
import { emit } from "./webhooks";
import { priceCart, checkCart, compactItems, assertValid } from "./rules";
import { ledger, insertOrder, type OrderRow } from "./ledger";
import { storeBySlug, orderNotifications, issueGiftCard } from "./orders";
import type { Session } from "./session";

type PoolItem = { id: string; qty: number; name: string; price: number };
export type PoolRow = {
  id: string; user_id: string; store_id: string | null; kind: "public" | "squad"; title: string; story: string; occasion: string;
  items: PoolItem[]; goal: number; raised: number; status: "open" | "ended" | "funded" | "cancelled";
  delivery: { name: string; phone: string; altPhone: string; address: string; lga: string; landmark: string; notes: string; installer: boolean };
  deadline: Date; extended: boolean; ended_at: Date | null; created_at: Date;
};

const OPEN = ["open", "ended"];

/* ---------- create ---------- */

export async function createPool(user: Session, b: Record<string, unknown>) {
  const cart = priceCart(b.items);
  checkCart(cart, "Pick a kit to fund first.");
  if (cart.total < MIN_CHARGE_NGN * 2) throw new HttpError(400, `Go Solar Me is for kits from ${naira(MIN_CHARGE_NGN * 2)}.`);
  const kind = oneOf(b.kind, ["public", "squad"] as const, "public");
  const sql = await db();
  const [owner] = await sql`select name, phone from users where id = ${user.uid}`;

  const forName = str(b.forName, 40) || firstName(owner?.name || user.name);
  const occasion = oneOf(b.occasion, OCCASIONS.map((o) => o.slug), "just-because");
  const errors: Record<string, string> = {};
  const d = {
    name: str(b.recipientName, 80) || owner?.name || user.name,
    phone: normalizePhone(str(b.recipientPhone, 24)) || normalizePhone(owner?.phone || ""),
    altPhone: normalizePhone(str(b.altPhone, 24)),
    address: str(b.address, 300),
    lga: str(b.lga, 40),
    landmark: str(b.landmark, 120),
    notes: str(b.notes, 300),
    installer: bool(b.installer),
  };
  if (!isName(forName)) errors.forName = "Who is it for? A first name is enough.";
  if (!isName(d.name)) errors.recipientName = "Enter the name of the person receiving it.";
  if (!NG_PHONE.test(d.phone)) errors.recipientPhone = "Enter the Nigerian number we should call for delivery.";
  if (d.altPhone && !NG_PHONE.test(d.altPhone)) errors.altPhone = "Enter a valid Nigerian number or leave it empty.";
  if (d.address && d.address.replace(/\s/g, "").length < 8) errors.address = "Enter the full address, or leave it for later.";
  if (!(LAGOS_LGAS as readonly string[]).includes(d.lga)) errors.lga = "Pick the LGA in Lagos.";

  let shares: { name: string; amount: number }[] = [];
  if (kind === "squad") {
    const names = (Array.isArray(b.shares) ? b.shares : []).slice(0, POOL.squadMax).map((s, i) => str((s as { name?: unknown })?.name ?? s, 40) || `Person ${i + 1}`);
    const n = names.length;
    if (n < POOL.squadMin || n > POOL.squadMax) errors.shares = `A squad is ${POOL.squadMin} to ${POOL.squadMax} people.`;
    else {
      const base = Math.floor(cart.total / n);
      if (base < MIN_CHARGE_NGN) errors.shares = `Each share must be at least ${naira(MIN_CHARGE_NGN)}. Use fewer people.`;
      shares = names.map((name, i) => ({ name, amount: base + (i < cart.total - base * n ? 1 : 0) }));
    }
  }
  assertValid(errors);

  const days = POOL.deadlineDays.includes(int(b.deadlineDays)) ? int(b.deadlineDays) : POOL.defaultDays;
  const title = str(b.title, 80) || (kind === "squad" ? `${firstName(owner?.name || user.name)}'s squad goes solar` : `Help ${forName} go solar`);
  const story = str(b.story, 1000) || OCCASIONS.find((o) => o.slug === occasion)!.story(forName);
  const store = await storeBySlug(b.ref);
  const pid = code();
  await sql.begin(async (tx) => {
    await tx`insert into pools ${tx({
      id: pid, user_id: user.uid, store_id: store?.id ?? null, kind, title, story, occasion,
      items: tx.json(compactItems(cart.lines)), goal: cart.total,
      delivery: tx.json({ ...d, phone: ngE164(d.phone), altPhone: d.altPhone ? ngE164(d.altPhone) : "" }),
      deadline: new Date(Date.now() + days * 864e5),
    })}`;
    for (const [i, s] of shares.entries()) await tx`insert into shares ${tx({ id: id(), pool_id: pid, name: s.name, amount: s.amount, position: i })}`;
  });
  await notifyOwner(`NEW GO SOLAR ME ${pid} (${kind}) — ${title} — goal ${naira(cart.total)} — ${d.lga}${d.address ? "" : " (address later)"}`);
  await emit("pool.created", { id: pid, kind, title, goal: cart.total, owner: { name: owner?.name || user.name, phone: owner?.phone || "" }, deadline_days: days, url: `/fund/${pid}` });
  return { id: pid, path: `/fund/${pid}`, goal: cart.total };
}

/* ---------- read ---------- */

/** Loads a pool, first moving it to "ended" if its deadline has passed. */
export async function loadPool(pid: string) {
  if (!/^[a-z0-9]{6,16}$/.test(pid)) return null;
  const sql = await db();
  await sql`update pools set status = 'ended', ended_at = now() where id = ${pid} and status = 'open' and deadline < now()`;
  const [p] = await sql`select * from pools where id = ${pid}`;
  return (p as unknown as PoolRow) ?? null;
}

/** Top supporters by total given. Named supporters are grouped by name; anonymous ones stay out of the ranking. */
function leaderboard(paid: Record<string, unknown>[]) {
  const by = new Map<string, { name: string; total: number; count: number }>();
  for (const c of paid) {
    const name = String(c.name ?? "").trim();
    if (c.anonymous || !name) continue;
    const k = name.toLowerCase();
    const e = by.get(k) ?? { name, total: 0, count: 0 };
    e.total += Number(c.amount); e.count += 1; by.set(k, e);
  }
  return [...by.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}

/** The public page. Street address and phone numbers are never included. */
export async function poolPage(pid: string, viewer: Session | null) {
  const p = await loadPool(pid);
  if (!p) return null;
  const sql = await db();
  const [owner] = await sql`select name from users where id = ${p.user_id}`;
  const paid = await sql`select name, message, amount, anonymous, piece, share_id, created_at from contributions where pool_id = ${pid} and status = 'paid' and amount > 0 order by created_at desc limit 200`;
  const shares = p.kind === "squad" ? await sql`select id, name, amount, status from shares where pool_id = ${pid} order by position` : [];
  const [order] = p.status === "funded" ? await sql`select id, status from orders where pool_id = ${pid} order by created_at desc limit 1` : [];
  const isOwner = viewer?.uid === p.user_id;
  const pieces = p.items.map((i) => ({ ...i, funded: Math.min(i.qty, paid.filter((c) => c.piece === i.id).length) }));
  return {
    id: p.id, kind: p.kind, title: p.title, story: p.story, occasion: p.occasion, owner: firstName(owner?.name), lga: p.delivery.lga,
    goal: p.goal, raised: p.raised, status: p.status, createdAt: p.created_at, deadline: p.deadline, extended: p.extended,
    choiceEnds: p.ended_at ? new Date(new Date(p.ended_at).getTime() + POOL.choiceDays * 864e5) : null,
    items: pieces, shares: shares.map((s) => ({ id: s.id, name: s.name, amount: s.amount, paid: s.status === "paid" })),
    supporters: paid.map((c) => ({ name: c.anonymous || !c.name ? "Anonymous" : c.name, message: c.message, amount: c.amount, at: c.created_at, piece: c.piece ? getProductById(c.piece)?.name ?? null : null })),
    leaders: leaderboard(paid),
    order: order ? { status: order.status } : null,
    isOwner,
    needsAddress: isOwner && !p.delivery.address,
  };
}
export type PoolPage = NonNullable<Awaited<ReturnType<typeof poolPage>>>;

/* ---------- chip in ---------- */

export async function createContribution(pid: string, input: Record<string, unknown>, user: Session | null, origin?: string) {
  const p = await loadPool(pid);
  if (!p) throw new HttpError(404, "This Go Solar Me page doesn't exist.");
  if (p.status === "funded") throw new HttpError(409, "This kit is fully funded. Thank you!");
  if (p.status === "cancelled") throw new HttpError(409, "This page was closed by its owner.");
  const remaining = p.goal - p.raised;
  const email = str(input.email, 120).toLowerCase();
  const name = str(input.name, 60);
  const errors: Record<string, string> = {};
  if (!isEmail(email)) errors.email = "Enter your email for the receipt.";
  if (name && !isName(name)) errors.name = "Enter your name, or tick Anonymous.";
  assertValid(errors);

  const sql = await db();
  let amount = int(input.amount);
  let piece: string | null = null;
  let shareId: string | null = null;
  if (str(input.shareId, 20)) {
    const [s] = await sql`select id, amount, status from shares where id = ${str(input.shareId, 20)} and pool_id = ${pid}`;
    if (!s) throw new HttpError(404, "That share doesn't exist.");
    if (s.status !== "open") throw new HttpError(409, "That share is already paid.");
    amount = s.amount;
    shareId = s.id;
  } else if (p.kind === "squad") {
    throw new HttpError(400, "Pick whose share you're paying.");
  } else if (str(input.piece, 60)) {
    const item = p.items.find((i) => i.id === str(input.piece, 60));
    if (!item) throw new HttpError(400, "That part isn't in this kit.");
    if (item.price > remaining) throw new HttpError(400, `That part costs more than what's left. Chip in ${naira(remaining)} to finish it.`);
    amount = item.price;
    piece = item.id;
  } else {
    const min = Math.min(MIN_CHARGE_NGN, remaining);
    if (amount < min) throw new HttpError(400, `The smallest amount is ${naira(min)}.`, { fields: { amount: `At least ${naira(min)}.` } });
    if (amount > remaining) throw new HttpError(400, `Only ${naira(remaining)} is left to reach the goal.`, { fields: { amount: `At most ${naira(remaining)}.` } });
  }

  const provider = pickProvider(input.provider);
  const cid = id();
  const row = { id: cid, pool_id: p.id, user_id: user?.uid ?? null, name, email, message: str(input.message, 200), amount, anonymous: bool(input.anonymous), piece, share_id: shareId };
  const metadata = { kind: "contribution", contribution_id: cid, pool_id: p.id };

  if (provider === "paystack") {
    const ref = newPaystackRef();
    await sql`insert into contributions ${sql({ ...row, pi_id: ref })}`;
    const ps = await startPaystack({ email, amountNgn: amount, metadata, origin, reference: ref, cancelPath: `/fund/${p.id}` }).catch(async (e) => {
      await sql`update contributions set status = 'abandoned' where id = ${cid} and status = 'pending'`;
      throw e;
    });
    return { provider, id: ps.ref, authorizationUrl: ps.authorizationUrl, amount };
  }

  const pi = await stripe().paymentIntents.create({
    amount: amount * 100, currency: "ngn", receipt_email: email, allowed_payment_method_types: ["card"],
    description: `Go Solar Me: ${p.title} (${p.id})`, metadata,
  });
  try {
    await sql`insert into contributions ${sql({ ...row, pi_id: pi.id })}`;
  } catch (e) {
    await stripe().paymentIntents.cancel(pi.id).catch(() => {});
    throw e;
  }
  return { provider, id: pi.id, clientSecret: pi.client_secret, amount };
}

/**
 * Counts a paid chip-in. Only what the goal still needs is kept: if the kit got funded first,
 * the extra goes straight back to the supporter's card. A gap under ₦1,000 is covered by us.
 */
export async function finalizeContribution(pay: Paid) {
  const sql = await db();
  const r = await sql.begin(async (tx) => {
    // A chip-in marked abandoned can still be paid late (Paystack pages stay open); count it then too.
    const [c] = await tx`update contributions set status = 'paid' where pi_id = ${pay.ref} and status in ('pending', 'abandoned') returning *`;
    if (!c) return null;
    const [p] = (await tx`select * from pools where id = ${c.pool_id} for update`) as unknown as PoolRow[];
    const paid = pay.amount;
    await ledger(tx, "payment", paid, p.id, pay.ref, "chip-in");
    let accept = 0;
    if (OPEN.includes(p.status)) {
      if (c.share_id) {
        const [s] = await tx`update shares set status = 'paid' where id = ${c.share_id} and status = 'open' returning id`;
        accept = s ? Math.min(paid, p.goal - p.raised) : 0;
      } else accept = Math.max(0, Math.min(paid, p.goal - p.raised));
    }
    const excess = paid - accept;
    await tx`update contributions set amount = ${accept}, refunded = ${excess}, status = ${accept > 0 ? "paid" : "refunded"} where id = ${c.id}`;
    const raised = p.raised + accept;
    await tx`update pools set raised = ${raised} where id = ${p.id}`;
    let order: OrderRow | null = null;
    const left = p.goal - raised;
    const doneSquad = p.kind === "squad" && (await tx`select count(*)::int as n from shares where pool_id = ${p.id} and status = 'open'`)[0].n === 0;
    if (accept > 0 && (left <= 0 || (p.kind === "public" && left < MIN_CHARGE_NGN) || doneSquad)) {
      if (left > 0) await ledger(tx, "store_cover", left, p.id, null, "gap under the minimum charge");
      order = await fundPool(tx, { ...p, raised });
    }
    return { c, p, accept, excess, order };
  });
  if (!r) return { ok: true, kind: "contribution", poolId: pay.metadata.pool_id, already: true };
  if (r.excess > 0) {
    const res = await refundPayment(pay.ref, r.excess, r.accept ? "more than the goal needed" : "goal already reached").catch((e: Error) => e);
    if (res instanceof Error) await notifyOwner(`REFUND FAILED for chip-in ${r.c.id} (${naira(r.excess)}): ${res.message}`);
    else await sql.begin((tx) => ledger(tx, "refund", r.excess, r.p.id, pay.ref, "over the goal"));
  }
  await notifyOwner(`CHIP-IN ${naira(r.accept)} to ${r.p.title} (${r.p.id}) from ${r.c.anonymous ? "Anonymous" : r.c.name || r.c.email}${r.excess ? ` · refunded ${naira(r.excess)}` : ""}`);
  if (r.order) await orderNotifications(r.order);
  if (r.accept > 0) await poolPushes(r.p, r.accept, r.c, !!r.order);
  return { ok: true, kind: "contribution", poolId: r.p.id, accepted: r.accept, refunded: r.excess, funded: !!r.order };
}

/** Tells the owner about a chip-in and any 25/50/75% milestone it crossed; at 100%, signed-in supporters too. */
async function poolPushes(p: PoolRow, accept: number, c: { name?: string; anonymous?: boolean; user_id?: string | null }, funded: boolean) {
  const data = { kind: "pool", id: p.id };
  const who = c.anonymous || !c.name ? "Someone" : c.name;
  const before = Math.floor((p.raised / p.goal) * 100), after = Math.floor(((p.raised + accept) / p.goal) * 100);
  if (funded) {
    await pushTo([p.user_id], { title: "Funded!", body: `${p.title} reached its goal. We're placing the order.`, data });
    const sql = await db();
    const sup = await sql`select distinct user_id from contributions where pool_id = ${p.id} and status = 'paid' and user_id is not null`;
    await pushTo(sup.map((x) => x.user_id as string).filter((u) => u !== p.user_id), { title: "You helped fund a kit", body: `${p.title} is fully funded. Thank you!`, data });
    return;
  }
  const crossed = [75, 50, 25].find((m) => before < m && after >= m);
  await pushTo([p.user_id], crossed
    ? { title: `${crossed}% funded`, body: `${who} chipped in ${naira(accept)}. ${naira(p.goal - p.raised - accept)} to go.`, data }
    : { title: "New chip-in", body: `${who} chipped in ${naira(accept)} to ${p.title}.`, data });
}

/** Marks a pool funded and places its order, inside the caller's transaction. */
async function fundPool(tx: Tx, p: PoolRow) {
  const [f] = await tx`update pools set status = 'funded' where id = ${p.id} and status = any(${OPEN}) returning id`;
  if (!f) return null;
  const [owner] = await tx`select name, email, phone from users where id = ${p.user_id}`;
  const [store] = p.store_id ? await tx`select user_id, commission_bps from stores where id = ${p.store_id}` : [];
  const commission = store && store.user_id !== p.user_id ? Math.round((p.goal * store.commission_bps) / 10000) : 0;
  const forOther = p.delivery.name && owner && p.delivery.name !== owner.name;
  return insertOrder(tx, {
    user_id: p.user_id, store_id: p.store_id, pool_id: p.id, items: tx.json(p.items), subtotal: p.goal,
    gift_card_used: 0, total_paid: p.raised, commission,
    buyer: tx.json({ name: owner?.name ?? "", email: owner?.email ?? "", phone: owner?.phone ?? "" }),
    delivery: tx.json(p.delivery), recipient: forOther ? tx.json({ name: p.delivery.name, phone: p.delivery.phone, message: p.title }) : null,
    installer: !!p.delivery.installer, status: "pending", source: "pool",
  });
}

/* ---------- owner actions ---------- */

export async function ownPool(user: Session, pid: string) {
  const p = await loadPool(pid);
  if (!p || p.user_id !== user.uid) throw new HttpError(404, "This page isn't yours or doesn't exist.");
  return p;
}

/** extend · smaller (switch to a kit the money covers) · cancel (refund everyone). */
export async function closePool(user: Session, pid: string, b: Record<string, unknown>) {
  const p = await ownPool(user, pid);
  const action = oneOf(b.action, ["extend", "smaller", "cancel"] as const, "extend");
  if (!OPEN.includes(p.status)) throw new HttpError(409, "This page is already closed.");
  const sql = await db();

  if (action === "extend") {
    if (p.extended) throw new HttpError(409, "You can extend once. Choose another option.");
    await sql`update pools set deadline = greatest(deadline, now()) + make_interval(days => ${POOL.extendDays}), extended = true, status = 'open', ended_at = null where id = ${pid} and status = any(${OPEN})`;
    return { ok: true, action };
  }

  if (action === "smaller") {
    const cart = priceCart(b.items);
    checkCart(cart, "Pick the smaller kit.");
    const r = await sql.begin(async (tx) => {
      const [cur] = (await tx`select * from pools where id = ${pid} for update`) as unknown as PoolRow[];
      if (!OPEN.includes(cur.status)) throw new HttpError(409, "This page is already closed.");
      if (cart.total > cur.raised) throw new HttpError(400, `That kit costs ${naira(cart.total)}, more than the ${naira(cur.raised)} raised.`);
      if (cur.kind === "squad") throw new HttpError(400, "Squad pages can't switch kits. Cover the missing shares or cancel.");
      const leftover = cur.raised - cart.total;
      await tx`update pools set items = ${tx.json(compactItems(cart.lines))}, goal = ${cart.total} where id = ${pid}`;
      const order = await fundPool(tx, { ...cur, items: compactItems(cart.lines), goal: cart.total, raised: cart.total });
      const [owner] = await tx`select name, email from users where id = ${cur.user_id}`;
      const gift = leftover > 0 ? await issueGiftCard(tx, leftover, { name: owner.name, email: owner.email }, `Left over from ${cur.title}`, pid) : null;
      return { order, gift, leftover };
    });
    if (r.order) await orderNotifications(r.order);
    return { ok: true, action, order: r.order?.id, giftCard: r.gift, leftover: r.leftover };
  }

  return { ok: true, action, ...(await cancelPool(pid, "cancelled by the owner")) };
}

/** Closes a pool and sends every supporter's money back to their card. */
export async function cancelPool(pid: string, why: string) {
  const sql = await db();
  const [c] = await sql`update pools set status = 'cancelled' where id = ${pid} and status = any(${OPEN}) returning title`;
  if (!c) return { refunded: 0, failed: 0 };
  const paid = await sql`select id, pi_id, amount from contributions where pool_id = ${pid} and status = 'paid' and amount > 0`;
  let refunded = 0, failed = 0;
  for (const x of paid) {
    const r = await refundPayment(x.pi_id, x.amount, why).catch((e: Error) => e);
    if (r instanceof Error) { failed++; continue; }
    refunded++;
    await sql.begin(async (tx) => {
      await tx`update contributions set status = 'refunded', refunded = refunded + amount where id = ${x.id}`;
      await ledger(tx, "refund", x.amount, pid, x.pi_id, why);
    });
  }
  await notifyOwner(`GO SOLAR ME ${pid} cancelled (${why}) — ${refunded} refunded${failed ? `, ${failed} FAILED, check Paystack/Stripe` : ""}`);
  return { refunded, failed };
}

/** Owner adds or changes the delivery address (it can be left until the kit is funded). */
export async function setPoolAddress(user: Session, pid: string, b: Record<string, unknown>) {
  const p = await ownPool(user, pid);
  const address = str(b.address, 300), landmark = str(b.landmark, 120), notes = str(b.notes, 300);
  if (address.replace(/\s/g, "").length < 8) throw new HttpError(400, "Enter the full delivery address.", { fields: { address: "House number, street, area." } });
  const delivery = { ...p.delivery, address, landmark, notes };
  const sql = await db();
  await sql`update pools set delivery = ${sql.json(delivery)} where id = ${pid}`;
  const [o] = await sql`update orders set delivery = ${sql.json(delivery)} where pool_id = ${pid} and status in ('pending', 'confirmed') returning id`;
  if (o) await notifyOwner(`ADDRESS ADDED for ${o.id} (Go Solar Me ${pid}): ${address}${landmark ? ` (near ${landmark})` : ""}, ${p.delivery.lga}`);
  return { ok: true };
}

/** Daily: end pools past their deadline; refund pools whose owner didn't choose in time. */
export async function sweepPools() {
  const sql = await db();
  // Runs once a day, so each of these reminders goes out once.
  const soon = await sql`select id, user_id, title from pools where status = 'open' and deadline between now() + interval '2 days' and now() + interval '3 days'`;
  for (const p of soon) await pushTo([p.user_id], { title: "3 days left", body: `Share ${p.title} once more to reach the goal.`, data: { kind: "pool", id: p.id } });
  const ended = await sql`update pools set status = 'ended', ended_at = now() where status = 'open' and deadline < now() returning id, user_id, title`;
  for (const p of ended) await pushTo([p.user_id], { title: "Deadline reached", body: `Choose what happens to ${p.title}: extend, a smaller kit, or refund.`, data: { kind: "pool", id: p.id } });
  const due = await sql`select id from pools where status = 'ended' and ended_at < now() - make_interval(days => ${POOL.choiceDays}) limit 50`;
  for (const p of due) await cancelPool(p.id, "no choice made after the deadline").catch((e) => console.error("[sweepPools]", p.id, e));
  // Chip-ins started but never paid.
  const stale = await sql`select id, pi_id from contributions where status = 'pending' and created_at < now() - interval '1 day' limit 100`;
  for (const c of stale) {
    const pay = await fetchPayment(c.pi_id).catch(() => null);
    if (!pay || pay.status === "processing") continue;
    if (pay.status === "succeeded") { await finalizeContribution(pay); continue; }
    if (providerOf(c.pi_id) === "stripe" && pay.status !== "canceled" && (await stripe().paymentIntents.cancel(c.pi_id).catch(() => null)) === null) continue;
    await sql`update contributions set status = 'abandoned' where id = ${c.id} and status = 'pending'`;
  }
  return { ended: due.length, staleChipIns: stale.length };
}
