import { body, fail, ok, requireUser, route, str, limitIp } from "@/lib/server/api";
import { customerFor, stripe, stripeConfigured } from "@/lib/server/stripe";
import { pickProvider, startPaystack, fetchPayment } from "@/lib/server/pay";
import { finalizePayment } from "@/lib/server/payments";
import { requirePaymentsOpen } from "@/lib/server/switch";
import { isPaystackRef } from "@/lib/server/paystack";

/**
 * Starts adding a card. provider "paystack" (naira card, default): returns authorizationUrl, where
 * Paystack checks the card with a ₦100 charge that we refund at once; the buyer comes back to
 * /account/cards?reference=…  provider "stripe" (card from abroad): returns a SetupIntent clientSecret.
 */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  await requirePaymentsOpen();
  await limitIp(req, "cardsetup", 10, 3600);
  const b = await body<{ nickname: string; provider: string }>(req);
  const provider = pickProvider(b.provider);
  if (provider === "paystack") {
    const ps = await startPaystack({
      email: s.email, amountNgn: 100, channels: ["card"], origin: new URL(req.url).origin,
      returnPath: "/account/cards", cancelPath: "/account/cards",
      metadata: { kind: "card_setup", user_id: s.uid, card_nickname: str(b.nickname, 40) },
    });
    return ok({ provider, id: ps.ref, authorizationUrl: ps.authorizationUrl });
  }
  const si = await stripe().setupIntents.create({ customer: await customerFor(s.uid), allowed_payment_method_types: ["card"], usage: "off_session", metadata: { nickname: str(b.nickname, 40) } });
  return ok({ provider, clientSecret: si.client_secret });
});

/** Back from adding a card: { reference } for Paystack, or { setupIntentId } for Stripe. */
export const PUT = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const b = await body<{ setupIntentId: string; reference: string }>(req);
  const reference = str(b.reference, 40);
  if (reference) {
    if (!isPaystackRef(reference)) return fail("Card was not saved.");
    const p = await fetchPayment(reference);
    if (!p || p.metadata.kind !== "card_setup" || p.metadata.user_id !== s.uid) return fail("Card was not saved.");
    if (p.status !== "succeeded") return fail(p.status === "canceled" ? "You cancelled before the card was checked." : "Your bank didn't approve the card check. Try another card.");
    const r = await finalizePayment(p);
    return r.ok ? ok({ ok: true }) : fail("error" in r && r.error ? r.error : "Card was not saved.");
  }
  if (!stripeConfigured()) return fail("Card was not saved.");
  const sid = str(b.setupIntentId, 80);
  if (!/^seti_[A-Za-z0-9]{8,}$/.test(sid)) return fail("Card was not saved.");
  const si = await stripe().setupIntents.retrieve(sid).catch(() => null);
  if (!si || si.customer !== (await customerFor(s.uid)) || si.status !== "succeeded") return fail("Card was not saved.");
  const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
  if (pm && si.metadata?.nickname) await stripe().paymentMethods.update(pm, { metadata: { nickname: si.metadata.nickname } });
  return ok({ ok: true });
});
