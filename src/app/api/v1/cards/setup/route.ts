import { body, fail, ok, requireUser, route, str } from "@/lib/server/api";
import { customerFor, stripe, stripeConfigured } from "@/lib/server/stripe";

/** Starts adding a card to the signed-in shopper's wallet. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  if (!stripeConfigured()) return fail("Payments are not switched on yet.", 503);
  const b = await body<{ nickname: string }>(req);
  const si = await stripe().setupIntents.create({ customer: await customerFor(s.uid), allowed_payment_method_types: ["card"], usage: "off_session", metadata: { nickname: str(b.nickname, 40) } });
  return ok({ clientSecret: si.client_secret });
});

/** After confirmSetup succeeds: copy the nickname onto the card. */
export const PUT = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  const sid = str((await body<{ setupIntentId: string }>(req)).setupIntentId, 80);
  if (!/^seti_[A-Za-z0-9]{8,}$/.test(sid)) return fail("Card was not saved.");
  const si = await stripe().setupIntents.retrieve(sid).catch(() => null);
  if (!si || si.customer !== (await customerFor(s.uid)) || si.status !== "succeeded") return fail("Card was not saved.");
  const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
  if (pm && si.metadata?.nickname) await stripe().paymentMethods.update(pm, { metadata: { nickname: si.metadata.nickname } });
  return ok({ ok: true });
});
