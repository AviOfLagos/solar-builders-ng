import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { db } from "./db";
import { HttpError, str } from "./api";
import { hashPassword, createSession } from "./session";
import { sendMail, shell, esc } from "./mail";
import { stripe, stripeConfigured, listCards } from "./stripe";
import { cancelPool } from "./pools";
import { isName, NG_PHONE, normalizePhone, ngE164 } from "@/lib/format";

/** Name and phone. Email stays fixed: it is how we find the account. */
export async function updateProfile(uid: string, b: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const set: Record<string, string> = {};
  if (b.name !== undefined) {
    const name = str(b.name, 80);
    if (!isName(name)) fields.name = "Enter your name."; else set.name = name;
  }
  if (b.phone !== undefined) {
    const phone = normalizePhone(str(b.phone, 24));
    if (phone && !NG_PHONE.test(phone)) fields.phone = "Enter a Nigerian mobile number or leave it empty."; else set.phone = phone ? ngE164(phone) : "";
  }
  if (Object.keys(fields).length) throw new HttpError(400, "Check the highlighted fields.", { fields });
  if (!Object.keys(set).length) throw new HttpError(400, "Nothing to change.");
  const sql = await db();
  const [u] = await sql`update users set ${sql(set)} where id = ${uid} returning id, email, name, phone`;
  return { user: u };
}

/**
 * Deletes an account (App Store and Play Store rule). Personal details and saved cards go;
 * orders and the money ledger stay, without a name, for our records. Open Go Solar Me pages are
 * closed and every supporter refunded.
 */
export async function deleteAccount(uid: string) {
  const sql = await db();
  const [u] = await sql`select stripe_customer_id from users where id = ${uid} and deleted_at is null`;
  if (!u) throw new HttpError(404, "Account not found.");
  const open = await sql`select id from pools where user_id = ${uid} and status in ('open', 'ended')`;
  for (const p of open) await cancelPool(p.id, "the owner deleted their account");
  if (u.stripe_customer_id && stripeConfigured()) {
    for (const c of await listCards(u.stripe_customer_id).catch(() => [])) await stripe().paymentMethods.detach(c.id).catch(() => {});
  }
  await sql.begin(async (tx) => {
    await tx`delete from paystack_cards where user_id = ${uid}`;
    await tx`delete from devices where user_id = ${uid}`;
    await tx`delete from password_resets where user_id = ${uid}`;
    await tx`delete from leads where user_id = ${uid} and order_id is null`;
    await tx`update stores set slug = ${"deleted-" + uid.slice(0, 12)}, name = 'Closed store', bio = '', whatsapp = '' where user_id = ${uid}`;
    await tx`update users set email = ${`deleted+${uid}@invalid`}, name = '', phone = '', password_hash = null, google_sub = null, apple_sub = null, stripe_customer_id = null, deleted_at = now() where id = ${uid}`;
  });
  return { ok: true, poolsClosed: open.length };
}

/* ---------- password reset by emailed code ---------- */

const hashCode = (uid: string, code: string) => createHash("sha256").update(`${uid}:${code}`).digest("hex");

/** Always answers the same way, so it never reveals which emails have accounts. */
export async function startReset(emailRaw: unknown) {
  const email = str(emailRaw, 120).toLowerCase();
  const sql = await db();
  const [u] = await sql`select id, name from users where email = ${email} and deleted_at is null`;
  if (u) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await sql`insert into password_resets (user_id, code_hash, attempts, expires_at) values (${u.id}, ${hashCode(u.id, code)}, 0, now() + interval '15 minutes')
      on conflict (user_id) do update set code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at`;
    await sendMail({
      to: [email],
      subject: `Your Solar Builders code: ${code}`,
      html: shell("Reset your password", `<p style="font-size:15px">Hi ${esc(u.name || "there")}, use this code to set a new password. It works for 15 minutes.</p><p style="font-size:30px;letter-spacing:6px;font-weight:bold">${code}</p><p style="color:#5B6B80">Didn't ask for this? Ignore this email; your password stays the same.</p>`),
      text: `Your Solar Builders code is ${code}. It works for 15 minutes.`,
    });
  }
  return { ok: true };
}

export async function confirmReset(b: Record<string, unknown>) {
  const email = str(b.email, 120).toLowerCase();
  const code = str(b.code, 12).replace(/\D/g, "");
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < 8 || password.length > 128) throw new HttpError(400, "Use 8 to 128 characters.", { fields: { password: "Use 8 to 128 characters." } });
  const sql = await db();
  const [u] = await sql`select u.id, u.email, u.name, r.code_hash, r.attempts, r.expires_at > now() as live from users u join password_resets r on r.user_id = u.id where u.email = ${email} and u.deleted_at is null`;
  const wrong = () => new HttpError(400, "That code isn't right or has expired. Ask for a new one.", { fields: { code: "Check the code." } });
  if (!u || !u.live || u.attempts >= 5 || code.length !== 6) {
    if (u) await sql`update password_resets set attempts = attempts + 1 where user_id = ${u.id}`;
    throw wrong();
  }
  const a = Buffer.from(hashCode(u.id, code)), e = Buffer.from(u.code_hash as string);
  if (a.length !== e.length || !timingSafeEqual(a, e)) {
    await sql`update password_resets set attempts = attempts + 1 where user_id = ${u.id}`;
    throw wrong();
  }
  await sql.begin(async (tx) => {
    await tx`update users set password_hash = ${await hashPassword(password)} where id = ${u.id}`;
    await tx`delete from password_resets where user_id = ${u.id}`;
  });
  const token = await createSession({ uid: u.id, email: u.email, name: u.name });
  return { user: { id: u.id as string, email: u.email as string, name: u.name as string }, token };
}
