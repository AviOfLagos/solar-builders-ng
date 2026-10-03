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
    body: JSON.stringify({ from, to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
  }).catch((e) => { console.error("[mail]", e); return null; });
  if (!res?.ok) console.error("[mail] Resend error", res?.status, await res?.text());
  return { ok: !!res?.ok };
}

export const esc = (x: unknown) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#E9EEF2;font-family:Arial,Helvetica,sans-serif;color:#10213B">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#10213B;color:#FFC21A;padding:18px 24px;font-size:18px;font-weight:bold">Solar Builders NG</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#F4F7F9;font-size:12px;color:#5B6B80">Solar Builders NG, Lagos, Nigeria</td></tr>
</table></td></tr></table></body></html>`;

/** Optional WhatsApp Cloud API alert to the owner. No-op until configured. */
export async function notifyOwner(text: string) {
  console.log("[owner-alert]", text.split("\n")[0]);
  const alertEmail = process.env.ORDER_ALERT_EMAIL;
  if (alertEmail) await sendMail({ to: [alertEmail], subject: text.split("\n")[0].slice(0, 120), html: shell("New activity", `<pre style="font-size:13px;white-space:pre-wrap">${esc(text)}</pre>`), text });
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ALERT_TO } = process.env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ALERT_TO) return;
  await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: WHATSAPP_ALERT_TO, type: "text", text: { body: text.slice(0, 4000) } }),
  }).catch((e) => console.error("[whatsapp]", e));
}
