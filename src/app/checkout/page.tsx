"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCartLines } from "@/components/CartDrawer";
import { CardChip } from "@/components/Header";
import { LAGOS_LGAS } from "@/config/store";
import { naira, NG_PHONE, normalizePhone, isEmail } from "@/lib/format";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<StripeJs | null> | null = pk ? loadStripe(pk) : null;

type Card = { id: string; brand: string; last4: string; nickname: string; expMonth: number; expYear: number };
type Me = { user: { email: string; name?: string } | null; cards: Card[] };

export default function CheckoutPage() {
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="mx-auto max-w-6xl px-4 py-16 text-mute">Loading checkout…</div>;
  if (!items.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <Link href="/shop" className="btn btn-ink mt-6">Browse products</Link>
      </div>
    );
  const amount = Math.round(subtotal * 100);
  return stripePromise ? (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment", amount, currency: "ngn", allowedPaymentMethodTypes: ["card"],
        setupFutureUsage: saveCard ? "off_session" : null,
        appearance: { theme: "stripe", variables: { colorPrimary: "#10213B", borderRadius: "10px", fontFamily: "Instrument Sans Variable, system-ui, sans-serif" } },
      }}
    >
      <WithStripe saveCard={saveCard} setSaveCard={setSaveCard} />
    </Elements>
  ) : (
    <CheckoutForm saveCard={saveCard} setSaveCard={setSaveCard} stripeReady={false} />
  );
}

function WithStripe(props: { saveCard: boolean; setSaveCard: (b: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutForm {...props} stripeReady stripe={stripe} elements={elements} />;
}

type FormProps = {
  saveCard: boolean; setSaveCard: (b: boolean) => void; stripeReady: boolean;
  stripe?: StripeJs | null; elements?: ReturnType<typeof useElements>;
};

function CheckoutForm({ saveCard, setSaveCard, stripeReady, stripe, elements }: FormProps) {
  const { items, subtotal } = useCartLines();
  const router = useRouter();
  const [me, setMe] = useState<Me>({ user: null, cards: [] });
  const [cardChoice, setCardChoice] = useState<string>("new");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", altPhone: "", address: "", lga: "", landmark: "", notes: "", installer: false, cardNickname: "", marketingOptIn: true });

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((m: Me) => {
      setMe(m);
      if (m.user) setF((x) => ({ ...x, email: x.email || m.user!.email, name: x.name || m.user!.name || "" }));
      if (m.cards[0]) setCardChoice(m.cards[0].id); // latest card first
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
    if (!NG_PHONE.test(normalizePhone(f.phone))) e.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
    if (f.altPhone && !NG_PHONE.test(normalizePhone(f.altPhone))) e.altPhone = "Enter a valid alternate number or leave it empty.";
    if (f.address.trim().length < 8) e.address = "Enter the full delivery address.";
    if (!f.lga) e.lga = "We deliver within Lagos only. Pick your LGA.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const useSaved = cardChoice !== "new";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Checkout</h1>
      {!me.user && (
        <p className="mt-2 text-sm text-mute">Saved a card before? <Link href="/account?next=/checkout" className="font-semibold text-ink underline">Sign in with your email</Link> to use it.</p>
      )}
      <form
        noValidate
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError("");
          if (!validate()) { setFormError("Check the highlighted fields."); return; }
          setBusy(true);
          try {
            await pay();
          } catch (err) {
            setFormError((err as Error).message || "Payment failed. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-8">
          <Section title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name}><input className="field" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} /></Field>
              <Field label="Email" error={errors.email}><input className="field" type="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!errors.email} /></Field>
              <Field label="Phone number" hint="We'll call this number to confirm your order." error={errors.phone}><input className="field" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} aria-invalid={!!errors.phone} /></Field>
              <Field label="Alternate phone (optional)" error={errors.altPhone}><input className="field" type="tel" placeholder="0812 345 6789" value={f.altPhone} onChange={set("altPhone")} aria-invalid={!!errors.altPhone} /></Field>
            </div>
          </Section>

          <Section title="Delivery in Lagos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street address" error={errors.address} className="sm:col-span-2"><input className="field" autoComplete="street-address" placeholder="House number, street, area" value={f.address} onChange={set("address")} aria-invalid={!!errors.address} /></Field>
              <Field label="Local government area" error={errors.lga}>
                <select className="field" value={f.lga} onChange={set("lga")} aria-invalid={!!errors.lga}>
                  <option value="">Choose your LGA</option>
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
                <span className="block text-sm text-mute">No charge now. We'll contact you after your order to connect you with one of our engineers and quote the installation. Skip this if you have your own installer.</span>
              </span>
            </label>
          </Section>

          <Section title="Payment">
            {!stripeReady ? (
              <p className="rounded-xl bg-sun/20 p-4 text-sm">Card payments are being switched on. To order now, message us on WhatsApp.</p>
            ) : (
              <div className="space-y-3">
                {me.cards.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm text-mute">Your saved cards ({me.user?.email})</legend>
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
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-[#10213B]" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                      Save this card for next time
                    </label>
                    {saveCard && (
                      <Field label="Name this card" hint="e.g. “GTB salary card” or “Business Visa”.">
                        <input className="field" maxLength={40} value={f.cardNickname} onChange={set("cardNickname")} placeholder="My card" />
                      </Field>
                    )}
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
          <div className="space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="num">{naira(subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery (Lagos)</span><span>Free</span></div>
            {f.installer && <div className="flex justify-between text-mute"><span>Installation</span><span>Quoted after order</span></div>}
            <div className="flex justify-between pt-2 text-lg font-semibold"><span>Total</span><span className="num font-display">{naira(subtotal)}</span></div>
          </div>
          <label className="flex gap-2 text-xs text-mute">
            <input type="checkbox" checked={f.marketingOptIn} onChange={set("marketingOptIn")} className="accent-[#10213B]" />
            Email me Solar Friday deals. Unsubscribe anytime.
          </label>
          {formError && <p role="alert" className="rounded-lg bg-flare/10 p-3 text-sm text-flare">{formError}</p>}
          <PayButton disabled={busy || !stripeReady} busy={busy} total={subtotal} />
          <p className="text-center text-xs text-mute">Payments are processed by Stripe. Your order is pending until we confirm it by phone.</p>
        </aside>
      </form>
    </div>
  );

  async function pay() {
    if (!stripe || !elements) throw new Error("Payment form is still loading. Try again in a moment.");
    const base = {
      items: items.map((l) => ({ id: l.id, qty: l.qty })),
      ...f,
      phone: normalizePhone(f.phone),
      altPhone: normalizePhone(f.altPhone),
    };
    if (useSaved) {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, savedCardId: cardChoice }) });
      const d = await r.json();
      if (!r.ok) { if (d.fields) setErrors(d.fields); throw new Error(d.error); }
      if (d.status === "requires_action") {
        const res = await stripe.handleNextAction({ clientSecret: d.clientSecret });
        if (res.error) throw new Error(res.error.message);
      }
      router.push(`/checkout/success?payment_intent=${d.id}`);
      return;
    }
    const sub = await elements.submit();
    if (sub.error) throw new Error(sub.error.message);
    const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, saveCard, cardNickname: saveCard ? f.cardNickname : "" }) });
    const d = await r.json();
    if (!r.ok) { if (d.fields) setErrors(d.fields); throw new Error(d.error); }
    const res = await stripe.confirmPayment({
      elements,
      clientSecret: d.clientSecret,
      confirmParams: { return_url: `${window.location.origin}/checkout/success`, receipt_email: f.email },
      redirect: "if_required",
    });
    if (res.error) throw new Error(res.error.message);
    router.push(`/checkout/success?payment_intent=${res.paymentIntent.id}`);
  }
}

function PayButton({ disabled, busy, total }: { disabled: boolean; busy: boolean; total: number }) {
  return <button type="submit" disabled={disabled} className="btn btn-sun w-full text-base">{busy ? "Processing…" : `Pay ${naira(total)}`}</button>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="font-display mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-flare">{error}</span> : hint ? <span className="mt-1 block text-mute">{hint}</span> : null}
    </label>
  );
}
