import "server-only";
import type Stripe from "stripe";
import { getProductById, brandName } from "@/lib/catalog";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { NG_PHONE, normalizePhone, isEmail, naira } from "@/lib/format";
import { stripe } from "./stripe";
import { sendMail, shell, addContact } from "./brevo";

export type CartLine = { id: string; qty: number };

export type CheckoutInput = {
  items: CartLine[];
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  address: string;
  lga: string;
  landmark?: string;
  installer: boolean;
  notes?: string;
  saveCard?: boolean;
  cardNickname?: string;
  savedCardId?: string;
  marketingOptIn?: boolean;
};

export function priceCart(items: CartLine[]) {
  const lines = items
    .map((l) => ({ p: getProductById(l.id), qty: Math.max(1, Math.min(20, Math.floor(Number(l.qty) || 1))) }))
    .filter((l): l is { p: NonNullable<ReturnType<typeof getProductById>>; qty: number } => !!l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const delivery = lines.length ? STORE.deliveryFee : 0;
  return { lines, subtotal, delivery, total: subtotal + delivery };
}

export function validateCheckout(i: Partial<CheckoutInput>) {
  const errors: Record<string, string> = {};
  const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
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
    saveCard: !!i.saveCard,
    cardNickname: clip(i.cardNickname, 40),
    savedCardId: clip(i.savedCardId, 60),
    marketingOptIn: !!i.marketingOptIn,
  };
  if (v.name.length < 2) errors.name = "Enter your full name.";
  if (!isEmail(v.email)) errors.email = "Enter a valid email address.";
  if (!NG_PHONE.test(v.phone)) errors.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
  if (v.altPhone && !NG_PHONE.test(v.altPhone)) errors.altPhone = "Enter a valid alternate number or leave it empty.";
  if (v.altPhone && v.altPhone === v.phone) errors.altPhone = "Use a different number from your main phone.";
  if (v.address.length < 8) errors.address = "Enter the full delivery address.";
  if (!(LAGOS_LGAS as readonly string[]).includes(v.lga)) errors.lga = "We deliver within Lagos only. Pick your LGA.";
  return { values: v, errors };
}

const ref = () => "SB-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export function orderMetadata(v: ReturnType<typeof validateCheckout>["values"], items: CartLine[]) {
  return {
    order_ref: ref(),
    customer_name: v.name,
    email: v.email,
    phone: v.phone,
    alt_phone: v.altPhone,
    address: v.address,
    lga: v.lga,
    landmark: v.landmark,
    installer: v.installer ? "yes" : "no",
    notes: v.notes,
    items: items.map((l) => `${l.id}:${l.qty}`).join(","),
    card_nickname: v.cardNickname,
    marketing: v.marketingOptIn ? "yes" : "no",
    status: "pending",
  } satisfies Stripe.MetadataParam;
}

export function linesFromMetadata(items: string) {
  return priceCart(items.split(",").filter(Boolean).map((s) => { const [id, q] = s.split(":"); return { id, qty: +q }; }));
}

/**
 * Runs once per successful payment (from the success page and/or the webhook):
 * names the saved card, emails the customer ("order received — pending") and the store owner.
 */
export async function finalizeOrder(pi: Stripe.PaymentIntent) {
  if (pi.status !== "succeeded" && pi.status !== "processing") return { ok: false, status: pi.status };
  const raw = pi.metadata;
  if (raw.notified === "yes") return { ok: true, already: true };

  const esc = (x: string) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const md = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, esc(v)])) as Record<string, string>;
  // Mark first to stay idempotent if webhook and success page race.
  await stripe().paymentIntents.update(pi.id, { metadata: { notified: "yes" } });

  const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pmId && raw.card_nickname && pi.setup_future_usage) {
    await stripe().paymentMethods.update(pmId, { metadata: { nickname: raw.card_nickname } }).catch(() => {});
  }

  const { lines, delivery } = linesFromMetadata(raw.items || "");
  const rows = lines
    .map((l) => `<tr><td style="padding:6px 0">${l.qty} × ${l.p.name}<br><span style="color:#5B6B80;font-size:12px">${brandName(l.p.brand)}</span></td><td align="right" style="padding:6px 0">${naira(l.p.price * l.qty)}</td></tr>`)
    .join("");
  const table = `<table width="100%" style="font-size:14px;border-collapse:collapse">${rows}
    <tr><td style="padding:6px 0;border-top:1px solid #E1E7EC">Delivery (Lagos)</td><td align="right" style="border-top:1px solid #E1E7EC">${delivery ? naira(delivery) : "Free"}</td></tr>
    <tr><td style="padding:6px 0"><b>Total paid</b></td><td align="right"><b>${naira(pi.amount / 100)}</b></td></tr></table>`;
  const textItems = lines.map((l) => `- ${l.qty} x ${l.p.name} (${naira(l.p.price * l.qty)})`).join("\n");

  await sendMail({
    to: [{ email: raw.email, name: raw.customer_name }],
    subject: `We've received your order ${md.order_ref}`,
    html: shell(
      `Thank you, ${md.customer_name.split(" ")[0]}. We've got your order.`,
      `<p style="font-size:15px;line-height:1.5">Your order <b>${md.order_ref}</b> is <b>pending</b>. We're working on it now and will call you on <b>${md.phone}</b> shortly to arrange delivery to ${md.lga}${md.installer === "yes" ? " and to connect you with one of our installers" : ""}.</p>${table}
       <p style="font-size:13px;color:#5B6B80">Delivery address: ${md.address}${md.landmark ? ` (near ${md.landmark})` : ""}, ${md.lga}, Lagos.</p>`
    ),
    text: `Thanks ${md.customer_name}. Your order ${md.order_ref} is pending. We'll call you on ${md.phone} shortly.\n${textItems}\nTotal: ${naira(pi.amount / 100)}`,
  });

  const wa = `https://wa.me/${raw.phone.replace(/^0/, "234").replace(/^\+/, "")}?text=${encodeURIComponent(`Hello ${md.customer_name}, this is Solar Builders NG about your order ${md.order_ref}.`)}`;
  const ownerText = `NEW ORDER ${md.order_ref} — ${naira(pi.amount / 100)}\n${md.customer_name} · ${md.phone}${md.alt_phone ? ` / ${md.alt_phone}` : ""} · ${md.email}\n${md.address}${md.landmark ? ` (near ${md.landmark})` : ""}, ${md.lga}\nInstaller: ${md.installer.toUpperCase()}\n${textItems}${md.notes ? `\nNotes: ${md.notes}` : ""}\nStripe: ${pi.id}`;

  if (process.env.ORDER_ALERT_EMAIL) {
    await sendMail({
      to: [{ email: process.env.ORDER_ALERT_EMAIL }],
      subject: `🛒 New order ${md.order_ref} · ${naira(pi.amount / 100)} · ${md.lga}${md.installer === "yes" ? " · needs installer" : ""}`,
      html: shell(`New order ${md.order_ref}`, `<pre style="font-size:13px;white-space:pre-wrap">${ownerText}</pre><p><a href="${wa}">Message customer on WhatsApp</a></p>`),
      text: ownerText,
    });
  }
  await notifyWhatsApp(ownerText);
  if (raw.marketing === "yes") await addContact(raw.email, { FIRSTNAME: raw.customer_name.split(" ")[0] });

  return { ok: true };
}

/** Optional: WhatsApp Cloud API alert to the store owner. No-op until configured. */
async function notifyWhatsApp(text: string) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ALERT_TO } = process.env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ALERT_TO) return;
  await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: WHATSAPP_ALERT_TO, type: "text", text: { body: text.slice(0, 4000) } }),
  }).catch((e) => console.error("[whatsapp]", e));
}
