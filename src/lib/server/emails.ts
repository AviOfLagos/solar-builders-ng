import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./api";
import { button, codeBox, esc, muted, para, sendMail, shell } from "./mail";

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL && !/vercel\.app/.test(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : "https://solar.nexprove.com").replace(/\/$/, "");
const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/* ---------- the messages (kept as plain functions so they can be previewed) ---------- */

export function verifyEmail(name: string, link: string) {
  return {
    subject: "Confirm your email for Solar Builders NG",
    html: shell(`Welcome, ${esc(first(name))}`,
      para("Thanks for joining. Confirm your email so we can reach you about orders, gifts and Go Solar Me pages.") + button(link, "Confirm my email") +
      para("With your account you can track orders, save your delivery details, share priced lists and start a Go Solar Me page for the kit you want.") +
      muted("This link works for 3 days. Didn't sign up? Ignore this email and nothing happens."),
      "One tap to confirm your email."),
    text: `Welcome to Solar Builders NG, ${first(name)}. Confirm your email: ${link}\nThe link works for 3 days. Didn't sign up? Ignore this email.`,
  };
}

export function resetEmail(name: string, code: string) {
  return {
    subject: `Your Solar Builders code: ${code}`,
    html: shell("Reset your password", para(`Hi ${esc(first(name))}, enter this code in the app or on the site to choose a new password. It works for 15 minutes.`) + codeBox(code) +
      muted("Didn't ask for this? Ignore this email. Your password stays the same."), `Your code is ${code}.`),
    text: `Your Solar Builders code is ${code}. It works for 15 minutes.`,
  };
}

const STEPS: Record<string, { title: string; line: string }> = {
  confirmed: { title: "Your order is confirmed", line: "We've confirmed it and are getting your items ready. We'll be in touch about delivery." },
  out_for_delivery: { title: "Your order is on its way", line: "It's out for delivery. Please keep your phone close so the rider can reach you." },
  delivered: { title: "Your order has been delivered", line: "It has arrived. If anything looks wrong, reply to this email or chat with us on WhatsApp." },
  installed: { title: "Lights on", line: "Your system is installed. Enjoy the power, and thank you for choosing us." },
};
export const orderStatusCopy = (status: string) => STEPS[status];

export function orderUpdateEmail(name: string, orderId: string, status: string) {
  const c = STEPS[status];
  if (!c) return null;
  return {
    subject: `${c.title}: ${orderId}`,
    html: shell(c.title, para(`Hi ${esc(first(name))}, order <b>${esc(orderId)}</b>: ${esc(c.line)}`) + button(`${SITE()}/account`, "See my order") + muted("Need help? Reply to this email."), c.line),
    text: `${c.title}. Order ${orderId}: ${c.line}`,
  };
}

/* ---------- verification ---------- */

/** Emails a confirm link. Safe to call again: it replaces the old link. Never throws, so signup is never blocked by mail. */
export async function sendVerification(uid: string) {
  try {
    const sql = await db();
    const [u] = await sql`select id, email, name, email_verified_at from users where id = ${uid} and deleted_at is null`;
    if (!u || u.email_verified_at) return { sent: false, already: !!u?.email_verified_at };
    const token = randomBytes(24).toString("base64url");
    await sql`delete from email_tokens where user_id = ${uid} or expires_at < now()`;
    await sql`insert into email_tokens (token_hash, user_id, expires_at) values (${hash(token)}, ${uid}, now() + interval '3 days')`;
    const m = verifyEmail(u.name, `${SITE()}/verify?token=${token}`);
    const r = await sendMail({ to: [u.email], ...m });
    return { sent: r.ok };
  } catch (e) {
    console.error("[verify email]", e);
    return { sent: false };
  }
}

export async function confirmEmail(token: string) {
  if (token.length < 20) throw new HttpError(400, "This link isn't valid.");
  const sql = await db();
  const [t] = await sql`delete from email_tokens where token_hash = ${hash(token)} and expires_at > now() returning user_id`;
  if (!t) throw new HttpError(400, "This link has expired or was already used.");
  await sql`update users set email_verified_at = coalesce(email_verified_at, now()) where id = ${t.user_id}`;
  return { ok: true };
}
