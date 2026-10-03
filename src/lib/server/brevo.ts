import "server-only";

type Mail = { to: { email: string; name?: string }[]; subject: string; html: string; text?: string; replyTo?: string };

export function brevoConfigured() {
  return !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export async function sendMail(m: Mail) {
  if (!brevoConfigured()) {
    console.log(`[mail:dev] to=${m.to.map((t) => t.email).join(",")} subject="${m.subject}"\n${m.text ?? ""}`);
    return { ok: true, dev: true };
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || "Solar Builders NG" },
      to: m.to,
      subject: m.subject,
      htmlContent: m.html,
      textContent: m.text,
      replyTo: m.replyTo ? { email: m.replyTo } : undefined,
    }),
  });
  if (!res.ok) {
    console.error("[mail] Brevo error", res.status, await res.text());
    return { ok: false };
  }
  return { ok: true };
}

/** Adds a shopper to the Brevo contact list (newsletter / promo alerts). */
export async function addContact(email: string, attrs: Record<string, string> = {}) {
  if (!process.env.BREVO_API_KEY) return { ok: true, dev: true };
  const listId = Number(process.env.BREVO_LIST_ID || 0);
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, attributes: attrs, updateEnabled: true, ...(listId ? { listIds: [listId] } : {}) }),
  });
  return { ok: res.ok || res.status === 204 };
}

export const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#E9EEF2;font-family:Arial,Helvetica,sans-serif;color:#10213B">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#10213B;color:#FFC21A;padding:18px 24px;font-size:18px;font-weight:bold">☀ Solar Builders NG</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#F4F7F9;font-size:12px;color:#5B6B80">Solar Builders NG · Lagos, Nigeria</td></tr>
</table></td></tr></table></body></html>`;
