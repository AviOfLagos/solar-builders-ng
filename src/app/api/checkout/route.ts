import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { stripe, stripeConfigured, findOrCreateCustomer, ownsCard } from "@/lib/server/stripe";
import { priceCart, validateCheckout, orderMetadata, type CheckoutInput } from "@/lib/server/orders";
import { STORE } from "@/config/store";
import type Stripe from "stripe";

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not switched on yet. Please call or WhatsApp us to order." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as Partial<CheckoutInput>;
  const cart = priceCart(Array.isArray(body.items) ? body.items : []);
  if (!cart.lines.length) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  const { values, errors } = validateCheckout(body);
  if (Object.keys(errors).length) return NextResponse.json({ error: "Check the highlighted fields.", fields: errors }, { status: 400 });

  const session = await getSession();
  // Signed-in shoppers use their own customer; guests saving a card get one by email.
  let customerId = session?.customerId;
  if (!customerId && values.saveCard) customerId = (await findOrCreateCustomer(values.email, values.name)).id;

  const metadata = orderMetadata(values, cart.lines.map((l) => ({ id: l.p.id, qty: l.qty })));
  const params: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(cart.total * 100),
    currency: STORE.currency.toLowerCase(),
    customer: customerId,
    receipt_email: values.email,
    description: `${metadata.order_ref} · ${cart.lines.length} item(s) · ${values.lga}, Lagos`,
    metadata,
    allowed_payment_method_types: ["card"],
    shipping: {
      name: values.name,
      phone: values.phone,
      address: { line1: values.address.slice(0, 200), line2: values.landmark || undefined, city: values.lga, state: "Lagos", country: "NG" },
    },
  };

  if (values.savedCardId) {
    if (!session) return NextResponse.json({ error: "Sign in to use a saved card." }, { status: 401 });
    if (!(await ownsCard(session.customerId, values.savedCardId))) return NextResponse.json({ error: "That card is no longer saved." }, { status: 400 });
    const pi = await stripe().paymentIntents.create({ ...params, payment_method: values.savedCardId, confirm: true, return_url: `${new URL(req.url).origin}/checkout/success` }).catch((e) => e);
    if (pi instanceof Error) return NextResponse.json({ error: pi.message }, { status: 402 });
    return NextResponse.json({ id: pi.id, status: pi.status, clientSecret: pi.client_secret, ref: metadata.order_ref });
  }

  const pi = await stripe().paymentIntents.create({ ...params, ...(values.saveCard && customerId ? { setup_future_usage: "off_session" as const } : {}) });
  return NextResponse.json({ id: pi.id, clientSecret: pi.client_secret, ref: metadata.order_ref, total: cart.total });
}
