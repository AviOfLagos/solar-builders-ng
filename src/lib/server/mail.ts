import "server-only";

type Mail = { to: string[]; subject: string; html: string; text?: string; replyTo?: string };

/** Resend (installed from the Vercel Marketplace, which injects RESEND_API_KEY). */
export function mailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendMail(m: Mail) {
  const to = m.to.filter(Boolean);
  if (!to.length) return { ok: false };
  if (!mailConfigured()) {
    console.log(`[mail:off] to=${to.join(",")} subject="${m.subject}"`);
    return { ok: false, off: true };
  }
  const from = process.env.MAIL_FROM || "Solar Builders NG <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    // Customer replies land in the team inbox whatever address we send from.
    body: JSON.stringify({ from, to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo || process.env.ORDER_ALERT_EMAIL || undefined }),
  }).catch((e) => { console.error("[mail]", e); return null; });
  if (!res?.ok) console.error("[mail] Resend error", res?.status, await res?.text());
  return { ok: !!res?.ok };
}

export const esc = (x: unknown) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL && !/vercel\.app/.test(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : "https://solar.nexprove.com").replace(/\/$/, "");
const WA = () => process.env.NEXT_PUBLIC_WHATSAPP || "2347030546907";

/** A mint button that works in every mail app (a table cell, not CSS the app might strip). */
export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:#BDF0A6;border-radius:14px"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#17201B;text-decoration:none;border-radius:14px">${esc(label)}</a></td></tr></table>`;

/** A big one-time code. */
export const codeBox = (code: string) =>
  `<p style="margin:20px 0;padding:18px;background:#F3F2EC;border-radius:14px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:800;color:#17201B">${esc(code)}</p>`;

export const para = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#17201B">${html}</p>`;
export const muted = (html: string) => `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#6B756F">${html}</p>`;

/**
 * Every email we send goes through this: the same calm look as the site and app (haze page, white card,
 * night header with the logo, mint button). Pass a short preheader to control the preview line in the inbox.
 */
export const shell = (title: string, body: string, preheader = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title.replace(/<[^>]+>/g, ""))}</title></head>
<body style="margin:0;padding:0;background:#F3F2EC;font-family:Manrope,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17201B">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F2EC">${esc(preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:24px;overflow:hidden">
<tr><td style="background:#1D2621;padding:22px 28px"><a href="${SITE()}"><img src="${SITE()}/email/logo.png" width="170" alt="Solar Builders NG" style="display:block;border:0;height:auto"></a></td></tr>
<tr><td style="padding:30px 28px 26px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:800;color:#17201B">${title}</h1>${body}</td></tr>
<tr><td style="padding:18px 28px 24px;background:#F9F8F4;font-size:12px;line-height:1.6;color:#6B756F">
<b style="color:#17201B">Solar Builders NG</b> · Lagos, Nigeria<br>
<a href="${SITE()}" style="color:#2F7D4F">Shop</a> &nbsp;·&nbsp; <a href="https://wa.me/${WA()}" style="color:#2F7D4F">Chat on WhatsApp</a> &nbsp;·&nbsp; <a href="${SITE()}/faq" style="color:#2F7D4F">Help</a><br>
Questions? Just reply to this email.</td></tr>
</table></td></tr></table></body></html>`;

/** Optional WhatsApp Cloud API alert to the owner. No-op until configured. */
export async function notifyOwner(text: string) {
  console.log("[owner-alert]", text.split("\n")[0]);
  const alertEmail = process.env.ORDER_ALERT_EMAIL;
  if (alertEmail) await sendMail({ to: [alertEmail], subject: text.split("\n")[0].slice(0, 120), html: shell("New activity", `<pre style="font-size:13px;white-space:pre-wrap">${esc(text)}</pre>`), text });
  // Slack: an incoming-webhook URL for the team channel (Vercel env SLACK_WEBHOOK_URL).
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 3000) }) }).catch((e) => console.error("[slack]", e));
  }
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ALERT_TO } = process.env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ALERT_TO) return;
  await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: WHATSAPP_ALERT_TO, type: "text", text: { body: text.slice(0, 4000) } }),
  }).catch((e) => console.error("[whatsapp]", e));
}
