"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCartLines } from "@/components/CartDrawer";
import { CardChip } from "@/components/Header";
import { stripePromise, stripeAppearance } from "@/components/StripePay";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { naira, NG_PHONE, normalizePhone, isEmail } from "@/lib/format";
import { api, getRef } from "@/lib/client";
import { Field, Section } from "@/components/Field";

type Card = { id: string; brand: string; last4: string; nickname: string; expMonth: number; expYear: number };
type Me = { user: { email: string; name?: string; phone?: string } | null; cards: Card[] };
type Gift = { code: string; balance: number } | null;

export default function CheckoutPage() {
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [gift, setGift] = useState<Gift>(null);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="mx-auto max-w-6xl px-4 py-16 text-mute">Loading checkout…</div>;
  if (!items.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <Link href="/shop" className="btn btn-ink mt-6">Browse products</Link>
      </div>
    );
  const giftUsed = gift ? Math.min(gift.balance, subtotal) : 0;
  const toPay = Math.max(subtotal - giftUsed, giftUsed && subtotal - giftUsed < 1000 && subtotal - giftUsed > 0 ? 1000 : 0);
  const props = { saveCard, setSaveCard, gift, setGift, toPay };
  return stripePromise && toPay > 0 ? (
    <Elements stripe={stripePromise} options={{ mode: "payment", amount: toPay * 100, currency: "ngn", allowedPaymentMethodTypes: ["card"], setupFutureUsage: saveCard ? "off_session" : null, appearance: stripeAppearance }}>
      <WithStripe {...props} />
    </Elements>
  ) : (
    <CheckoutForm {...props} stripeReady={!!stripePromise} />
  );
}

type Shared = { saveCard: boolean; setSaveCard: (b: boolean) => void; gift: Gift; setGift: (g: Gift) => void; toPay: number };

function WithStripe(props: Shared) {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutForm {...props} stripeReady stripe={stripe} elements={elements} />;
}

function CheckoutForm({ saveCard, setSaveCard, gift, setGift, toPay, stripeReady, stripe, elements }: Shared & { stripeReady: boolean; stripe?: StripeJs | null; elements?: ReturnType<typeof useElements> }) {
  const { items, subtotal } = useCartLines();
  const router = useRouter();
  const [me, setMe] = useState<Me>({ user: null, cards: [] });
  const [cardChoice, setCardChoice] = useState("new");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [giftInput, setGiftInput] = useState("");
  const [giftMsg, setGiftMsg] = useState("");
  const [ref, setRefSlug] = useState<string | undefined>();
  const [f, setF] = useState({
    forSomeoneElse: false, recipientName: "", recipientPhone: "", giftMessage: "",
    name: "", email: "", phone: "", altPhone: "", address: "", lga: "", landmark: "", notes: "", installer: false, cardNickname: "",
  });

  useEffect(() => {
    setRefSlug(getRef());
    if (new URLSearchParams(location.search).get("for") === "someone") setF((x) => ({ ...x, forSomeoneElse: true }));
    api<Me>("/me").then((m) => {
      setMe(m);
      if (m.user) setF((x) => ({ ...x, email: x.email || m.user!.email, name: x.name || m.user!.name || "", phone: x.phone || m.user!.phone || "" }));
      if (m.cards[0]) setCardChoice(m.cards[0].id);
    }).catch(() => {});
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  function validate() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter your full name.";
    if (!isEmail(f.email.trim())) e.email = "Enter a valid email address.";
    if (f.forSomeoneElse) {
      if (f.recipientName.trim().length < 2) e.recipientName = "Enter the name of the person receiving it.";
      if (!NG_PHONE.test(normalizePhone(f.recipientPhone))) e.recipientPhone = "Enter their Nigerian mobile number.";
    } else if (!NG_PHONE.test(normalizePhone(f.phone))) e.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
    if (f.altPhone && !NG_PHONE.test(normalizePhone(f.altPhone))) e.altPhone = "Enter a valid alternate number or leave it empty.";
    if (f.address.trim().length < 8) e.address = "Enter the full delivery address.";
    if (!f.lga) e.lga = "We deliver within Lagos only. Pick the LGA.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const useSaved = cardChoice !== "new" && me.cards.length > 0;
  const giftUsed = subtotal - toPay;
  const other = f.forSomeoneElse;

  async function pay() {
    const base = { items: items.map((l) => ({ id: l.id, qty: l.qty })), ...f, ref, giftCode: gift?.code, source: "web" };
    if (toPay === 0) {
      const d = await api<{ ref: string; paid: boolean }>("/checkout", { body: base });
      router.push(`/checkout/success?order=${d.ref}`);
      return;
    }
    if (!stripe || !elements) throw new Error("Payment form is still loading. Try again in a moment.");
    if (useSaved) {
      const d = await api<{ id: string; clientSecret: string; paymentStatus: string }>("/checkout", { body: { ...base, savedCardId: cardChoice } });
      if (d.paymentStatus === "requires_action") {
        const r = await stripe.handleNextAction({ clientSecret: d.clientSecret });
        if (r.error) throw new Error(r.error.message);
      }
      router.push(`/checkout/success?payment_intent=${d.id}`);
      return;
    }
    const sub = await elements.submit();
    if (sub.error) throw new Error(sub.error.message);
    const d = await api<{ clientSecret: string }>("/checkout", { body: { ...base, saveCard: saveCard && !!me.user, cardNickname: saveCard ? f.cardNickname : "" } });
    const r = await stripe.confirmPayment({ elements, clientSecret: d.clientSecret, confirmParams: { return_url: `${location.origin}/checkout/success`, receipt_email: f.email }, redirect: "if_required" });
    if (r.error) throw new Error(r.error.message);
    router.push(`/checkout/success?payment_intent=${r.paymentIntent.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Checkout</h1>
      {!me.user && <p className="mt-2 text-sm text-mute">Have an account? <Link href="/account?next=/checkout" className="font-semibold text-ink underline">Sign in</Link> to use saved cards.</p>}
      <form noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]" onSubmit={async (e) => {
        e.preventDefault();
        setFormError("");
        if (!validate()) { setFormError("Check the highlighted fields."); return; }
        setBusy(true);
        try { await pay(); } catch (err) {
          const ex = err as Error & { fields?: Record<string, string> };
          if (ex.fields) setErrors(ex.fields);
          setFormError(ex.message || "Payment failed. Try again.");
        } finally { setBusy(false); }
      }}>
        <div className="space-y-8">
          <Section title="Who is this for?">
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {[["Me", false], ["Someone else", true]].map(([l, v]) => (
                <button type="button" key={String(l)} role="radio" aria-checked={other === v} onClick={() => setF((x) => ({ ...x, forSomeoneElse: v as boolean }))}
                  className={`rounded-xl border p-4 text-left ${other === v ? "border-ink bg-sun/15" : "border-line"}`}>
                  <span className="block font-semibold">{l as string}</span>
                  <span className="text-sm text-mute">{v ? "Family, a friend, staff. Pay from anywhere." : "Delivered to my address."}</span>
                </button>
              ))}
            </div>
            {other && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Their full name" error={errors.recipientName}><input className="field" value={f.recipientName} onChange={set("recipientName")} aria-invalid={!!errors.recipientName} /></Field>
                <Field label="Their phone number" hint="We call them to arrange delivery." error={errors.recipientPhone}><input className="field" type="tel" placeholder="0803 123 4567" value={f.recipientPhone} onChange={set("recipientPhone")} aria-invalid={!!errors.recipientPhone} /></Field>
                <Field label="A note for them (optional)" className="sm:col-span-2"><input className="field" maxLength={300} placeholder="e.g. Happy birthday Mum, no more NEPA wahala" value={f.giftMessage} onChange={set("giftMessage")} /></Field>
              </div>
            )}
          </Section>

          <Section title={other ? "Your details" : "Contact"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name}><input className="field" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} /></Field>
              <Field label="Email" hint={other ? "We send the receipt and updates here." : undefined} error={errors.email}><input className="field" type="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!errors.email} /></Field>
              <Field label={other ? "Your phone (any country, optional)" : "Phone number"} hint={other ? undefined : "We'll call this number to confirm your order."} error={errors.phone}><input className="field" type="tel" autoComplete="tel" placeholder={other ? "+44 7700 900123" : "0803 123 4567"} value={f.phone} onChange={set("phone")} aria-invalid={!!errors.phone} /></Field>
              <Field label="Alternate Nigerian number (optional)" error={errors.altPhone}><input className="field" type="tel" placeholder="0812 345 6789" value={f.altPhone} onChange={set("altPhone")} aria-invalid={!!errors.altPhone} /></Field>
            </div>
          </Section>

          <Section title={other ? "Their address in Lagos" : "Delivery in Lagos"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street address" error={errors.address} className="sm:col-span-2"><input className="field" autoComplete="street-address" placeholder="House number, street, area" value={f.address} onChange={set("address")} aria-invalid={!!errors.address} /></Field>
              <Field label="Local government area" error={errors.lga}>
                <select className="field" value={f.lga} onChange={set("lga")} aria-invalid={!!errors.lga}>
                  <option value="">Choose the LGA</option>
                  {LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Nearest landmark (optional)"><input className="field" placeholder="e.g. opposite Shoprite" value={f.landmark} onChange={set("landmark")} /></Field>
              <Field label="Delivery notes (optional)" className="sm:col-span-2"><textarea className="field" rows={2} value={f.notes} onChange={set("notes")} /></Field>
            </div>
            <p className="mt-3 text-sm text-mute">We only deliver within Lagos State. Delivery is free.</p>
          </Section>

          <Section title="Installation">
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${f.installer ? "border-ink bg-sun/15" : "border-line bg-white"}`}>
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[#10213B]" checked={f.installer} onChange={set("installer")} />
              <span>
                <span className="block font-semibold">I need an installer</span>
                <span className="block text-sm text-mute">No charge now. We'll contact {other ? "them" : "you"} after the order to connect an engineer and quote the installation.</span>
              </span>
            </label>
          </Section>

          <Section title="Payment">
            {toPay === 0 ? <p className="rounded-xl bg-leaf/10 p-4 text-sm">Your gift card covers this order. No card needed.</p> : !stripeReady ? (
              <p className="rounded-xl bg-sun/20 p-4 text-sm">Card payments are being switched on. To order now, <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}`}>message us on WhatsApp</a>.</p>
            ) : (
              <div className="space-y-3">
                {me.cards.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm text-mute">Your saved cards</legend>
                    {me.cards.map((c) => (
                      <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2 pr-4 ${cardChoice === c.id ? "border-ink" : "border-line"}`}>
                        <input type="radio" name="card" className="ml-2 accent-[#10213B]" checked={cardChoice === c.id} onChange={() => setCardChoice(c.id)} />
                        <div className="flex-1"><CardChip c={c} /></div>
                      </label>
                    ))}
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${cardChoice === "new" ? "border-ink" : "border-line"}`}>
                      <input type="radio" name="card" className="accent-[#10213B]" checked={cardChoice === "new"} onChange={() => setCardChoice("new")} />
                      <span className="font-medium">Use a new card</span>
                    </label>
                  </fieldset>
                )}
                {!useSaved && (
                  <div className="space-y-4 rounded-xl border border-line bg-white p-4">
                    <PaymentElement options={{ layout: "tabs" }} />
                    {me.user ? (
                      <>
                        <label className="flex items-center gap-3 text-sm">
                          <input type="checkbox" className="h-4 w-4 accent-[#10213B]" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                          Save this card for next time
                        </label>
                        {saveCard && <Field label="Name this card" hint="e.g. “GTB salary card” or “Business Visa”."><input className="field" maxLength={40} value={f.cardNickname} onChange={set("cardNickname")} placeholder="My card" /></Field>}
                      </>
                    ) : <p className="text-xs text-mute"><Link className="underline" href="/account?next=/checkout">Create an account</Link> to save and name cards.</p>}
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-paper p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <ul className="space-y-3">
            {items.map((l) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <span className="relative h-14 w-14 shrink-0 rounded-lg border border-line bg-white"><Image src={l.p.image} alt="" fill sizes="56px" className="object-contain p-1" /></span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2">{l.p.name}</span><span className="text-mute">Qty {l.qty}</span></span>
                <span className="num font-medium">{naira(l.p.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-3">
            {gift ? (
              <div className="flex items-center justify-between rounded-lg bg-leaf/10 p-2 text-sm"><span>Gift card {gift.code}</span><button type="button" className="underline" onClick={() => setGift(null)}>Remove</button></div>
            ) : (
              <div className="flex gap-2">
                <input className="field !py-2 text-sm" placeholder="Gift card code" value={giftInput} onChange={(e) => setGiftInput(e.target.value)} aria-label="Gift card code" />
                <button type="button" className="btn btn-ghost !px-3 !py-2 text-sm" onClick={async () => {
                  setGiftMsg("");
                  try { setGift(await api<{ code: string; balance: number }>(`/gift-cards/${encodeURIComponent(giftInput.trim())}`)); } catch (x) { setGiftMsg((x as Error).message); }
                }}>Apply</button>
              </div>
            )}
            {giftMsg && <p className="mt-1 text-xs text-flare">{giftMsg}</p>}
          </div>
          <div className="space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="num">{naira(subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery (Lagos)</span><span>Free</span></div>
            {giftUsed > 0 && <div className="flex justify-between text-leaf"><span>Gift card</span><span className="num">−{naira(giftUsed)}</span></div>}
            {f.installer && <div className="flex justify-between text-mute"><span>Installation</span><span>Quoted after order</span></div>}
            <div className="flex justify-between pt-2 text-lg font-semibold"><span>To pay</span><span className="num font-display">{naira(toPay)}</span></div>
          </div>
          {ref && <p className="text-xs text-mute">Referred by <b>{ref}</b></p>}
          {formError && <p role="alert" className="rounded-lg bg-flare/10 p-3 text-sm text-flare">{formError}</p>}
          <button type="submit" disabled={busy || (toPay > 0 && !stripeReady)} className="btn btn-sun w-full text-base">{busy ? "Processing…" : toPay === 0 ? "Place order" : `Pay ${naira(toPay)}`}</button>
          <p className="text-center text-xs text-mute">Payments are processed by Stripe. Your order is pending until we confirm it by phone.</p>
          <p className="text-center text-xs"><Link className="underline" href="/pay-small-small">Pay small small instead</Link> · <Link className="underline" href="/fund/new">Fund it with friends</Link></p>
        </aside>
      </form>
    </div>
  );
}
