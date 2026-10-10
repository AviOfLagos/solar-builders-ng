"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCartLines } from "@/components/CartDrawer";
import { CardChip, type Card } from "@/components/Header";
import { PayWith, usePayOptions, defaultProvider, goToPaystack, type Provider } from "@/components/PayWith";
import { stripePromise, stripeAppearance, successUrl } from "@/components/StripePay";
import { LAGOS_LGAS, STORE } from "@/config/store";
import { naira, NG_PHONE, INTL_PHONE, normalizePhone, isEmail, isName } from "@/lib/format";
import { api, getRef, getLeadId, saveLead, type ApiError } from "@/lib/client";
import { Field } from "@/components/Field";
import { Flow, Next } from "@/components/ui/Flow";

const MIN_CHARGE = 1000;
type Me = { user: { email: string; name?: string; phone?: string } | null; cards: Card[]; lastDelivery: { address: string; lga: string; landmark: string; altPhone: string } | null };
type Gift = { code: string; balance: number } | null;
type Form = {
  forSomeoneElse: boolean; recipientName: string; recipientPhone: string; giftMessage: string;
  name: string; email: string; phone: string; altPhone: string; address: string; lga: string; landmark: string; notes: string; installer: boolean; cardNickname: string;
};

/** Same split the server uses: a gift card covers what it can, and any card charge stays at least ₦1,000. */
function split(total: number, gift: Gift) {
  if (!gift) return { giftUsed: 0, toPay: total };
  let used = Math.min(gift.balance, total);
  if (total - used > 0 && total - used < MIN_CHARGE) used = Math.max(0, total - MIN_CHARGE);
  return { giftUsed: used, toPay: total - used };
}

export default function CheckoutPage() {
  const { items, subtotal } = useCartLines();
  const [mounted, setMounted] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [gift, setGift] = useState<Gift>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the cart lives in localStorage, so render only after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="mx-auto max-w-6xl px-4 py-16 text-mute">Loading checkout…</div>;
  if (!items.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <p className="mt-3 text-ink-2">Find the right kit in three quick questions.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/find" className="btn btn-ink">Find my kit</Link><Link href="/shop" className="btn btn-ghost">Browse the shop</Link></div>
      </div>
    );
  const { toPay } = split(subtotal, gift);
  const props = { saveCard, setSaveCard, gift, setGift, toPay };
  // One Elements tree for the whole page, so the form never resets when the amount changes.
  return stripePromise ? (
    <Elements stripe={stripePromise} options={{ mode: "payment", amount: Math.max(MIN_CHARGE, toPay) * 100, currency: "ngn", allowedPaymentMethodTypes: ["card"], setupFutureUsage: saveCard ? "off_session" : null, appearance: stripeAppearance }}>
      <WithStripe {...props} />
    </Elements>
  ) : (
    <CheckoutForm {...props} stripeReady={false} />
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
  const [me, setMe] = useState<Me>({ user: null, cards: [], lastDelivery: null });
  const opts = usePayOptions();
  const [method, setMethod] = useState<Provider>("paystack");
  const [cardChoice, setCardChoice] = useState("auto");
  const [cardReady, setCardReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [giftInput, setGiftInput] = useState("");
  const [giftMsg, setGiftMsg] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [ref, setRefSlug] = useState<string | undefined>();
  const [f, setF] = useState<Form>({
    forSomeoneElse: false, recipientName: "", recipientPhone: "", giftMessage: "",
    name: "", email: "", phone: "", altPhone: "", address: "", lga: "", landmark: "", notes: "", installer: false, cardNickname: "",
  });
  const lastLead = useRef("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [more, setMore] = useState({ alt: false, notes: false, gift: false });
  // eslint-disable-next-line react-hooks/set-state-in-effect -- pick naira unless only international cards are on
  useEffect(() => { if (opts) setMethod(defaultProvider(opts)); }, [opts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state once
    setRefSlug(getRef());
    if (new URLSearchParams(location.search).get("for") === "someone") setF((x) => ({ ...x, forSomeoneElse: true }));
    api<Me>("/me").then((m) => {
      setMe(m);
      if (m.user) setF((x) => ({ ...x, email: x.email || m.user!.email, name: x.name || m.user!.name || "", phone: x.phone || m.user!.phone || "" }));
      if (m.lastDelivery) setF((x) => (x.forSomeoneElse || x.address ? x : { ...x, ...m.lastDelivery }));
    }).catch(() => {});
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  /** Save how to reach them as soon as they give it, so an unfinished checkout can be followed up. */
  function captureLead() {
    const phone = normalizePhone(f.phone);
    const okPhone = NG_PHONE.test(phone) || INTL_PHONE.test(phone);
    const okEmail = isEmail(f.email.trim());
    if (!okPhone && !okEmail) return;
    const key = `${phone}|${f.email}|${f.name}|${items.length}`;
    if (key === lastLead.current) return;
    lastLead.current = key;
    saveLead({ name: f.name, phone: okPhone ? phone : "", email: okEmail ? f.email.trim() : "", consent: true, source: "checkout", items: items.map((l) => ({ id: l.id, qty: l.qty })) }).catch(() => {});
  }

  // Each step checks only its own fields (docs/DESIGN.md rule 3).
  const STEP_FIELDS: Record<1 | 2, string[]> = { 1: ["name", "email", "phone", "recipientName", "recipientPhone", "altPhone"], 2: ["address", "lga"] };
  function validate(which: 1 | 2 | "all" = "all") {
    const e: Record<string, string> = {};
    if (which !== 2) {
      if (!isName(f.name)) e.name = "Enter your full name.";
      if (!isEmail(f.email.trim())) e.email = "Enter a valid email address.";
      const phone = normalizePhone(f.phone);
      if (f.forSomeoneElse) {
        if (!isName(f.recipientName)) e.recipientName = "Enter the name of the person receiving it.";
        if (!NG_PHONE.test(normalizePhone(f.recipientPhone))) e.recipientPhone = "Enter their Nigerian mobile number.";
        if (phone && !NG_PHONE.test(phone) && !INTL_PHONE.test(phone)) e.phone = "Enter a valid number with country code, or leave it empty.";
      } else if (!NG_PHONE.test(phone)) e.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
      if (f.altPhone && !NG_PHONE.test(normalizePhone(f.altPhone))) e.altPhone = "Enter a valid Nigerian number or leave it empty.";
    }
    if (which !== 1) {
      if (f.address.replace(/\s/g, "").length < 8) e.address = "Enter the full delivery address.";
      if (!f.lga) e.lga = "We deliver within Lagos only. Pick the LGA.";
    }
    setErrors(e);
    if (which === "all") { if (Object.keys(e).some((k) => STEP_FIELDS[1].includes(k))) setStep(1); else if (Object.keys(e).length) setStep(2); }
    return Object.keys(e).length === 0;
  }
  const next = (from: 1 | 2) => { if (validate(from)) { if (from === 1) captureLead(); setStep((from + 1) as 2 | 3); scrollTo({ top: 0 }); } };

  async function applyGift(code = giftInput) {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!c) { setGiftMsg("Enter the code from your gift card."); return; }
    setGiftBusy(true); setGiftMsg("");
    try { setGift(await api<{ code: string; balance: number }>(`/gift-cards/${encodeURIComponent(c)}`)); setGiftInput(""); }
    catch (x) { setGiftMsg((x as Error).message); setGift(null); }
    finally { setGiftBusy(false); }
  }

  const cards = me.cards.filter((c) => (c.provider ?? "stripe") === method);
  const choice = cardChoice === "new" ? "new" : cards.find((c) => c.id === cardChoice)?.id ?? cards[0]?.id ?? "new";
  const useSaved = choice !== "new";
  const canPay = method === "paystack" ? !!opts?.naira : !!opts?.intl && stripeReady && (useSaved || cardReady);
  const giftUsed = subtotal - toPay;
  const other = f.forSomeoneElse;
  const cancel = (id: string, clientSecret: string) => api(`/payments/${id}/cancel`, { body: { clientSecret } }).catch(() => {});

  async function pay() {
    const base = { items: items.map((l) => ({ id: l.id, qty: l.qty })), ...f, ref, giftCode: gift?.code, leadId: getLeadId(), expectedTotal: toPay, source: "web" };
    if (toPay === 0) {
      const d = await api<{ ref: string; paid?: boolean }>("/checkout", { body: base });
      if (!d.paid) throw new Error("Your gift card no longer covers this order. Check the total and try again.");
      router.push(`/checkout/success?order=${d.ref}`);
      return;
    }
    if (method === "paystack") {
      const d = await api<{ id: string; authorizationUrl?: string; paymentStatus: string }>("/checkout", {
        body: { ...base, provider: "paystack", savedCardId: useSaved ? choice : undefined, saveCard: !useSaved && saveCard && !!me.user, cardNickname: saveCard ? f.cardNickname : "" },
      });
      if (d.authorizationUrl) { goToPaystack(d.authorizationUrl); return; }
      router.push(`/checkout/success?reference=${encodeURIComponent(d.id)}`);
      return;
    }
    if (!stripe || !elements) throw new Error("The payment form is still loading. Try again in a moment.");
    if (useSaved) {
      const d = await api<{ id: string; clientSecret: string; paymentStatus: string }>("/checkout", { body: { ...base, provider: "stripe", savedCardId: choice } });
      if (d.paymentStatus === "requires_action") {
        const r = await stripe.handleNextAction({ clientSecret: d.clientSecret });
        if (r.error) { await cancel(d.id, d.clientSecret); throw new Error(r.error.message || "Your bank didn't approve the payment."); }
      } else if (d.paymentStatus !== "succeeded" && d.paymentStatus !== "processing") {
        await cancel(d.id, d.clientSecret);
        throw new Error("That card wasn't charged. Try another card.");
      }
      router.push(successUrl(d.id, d.clientSecret));
      return;
    }
    const sub = await elements.submit();
    if (sub.error) throw new Error(sub.error.message);
    const d = await api<{ id: string; clientSecret: string }>("/checkout", { body: { ...base, provider: "stripe", saveCard: saveCard && !!me.user, cardNickname: saveCard ? f.cardNickname : "" } });
    const r = await stripe.confirmPayment({ elements, clientSecret: d.clientSecret, confirmParams: { return_url: `${location.origin}/checkout/success`, receipt_email: f.email.trim() }, redirect: "if_required" });
    if (r.error) { await cancel(d.id, d.clientSecret); throw new Error(r.error.message || "Payment failed. Try again or use another card."); }
    router.push(successUrl(r.paymentIntent.id, d.clientSecret));
  }

  async function submit() {
    if (busy) return;
    setFormError("");
    if (!validate()) { setFormError("Check the highlighted fields."); return; }
    setBusy(true);
    try { await pay(); } catch (err) {
      const ex = err as ApiError;
      if (ex.fields) {
        setErrors(ex.fields);
        const bad = Object.keys(ex.fields);
        if (bad.some((k) => STEP_FIELDS[1].includes(k))) setStep(1); else if (bad.some((k) => STEP_FIELDS[2].includes(k))) setStep(2);
      }
      if (ex.data?.code === "gift_changed") setGift(null);
      if (ex.data?.code === "amount_changed" && gift) await applyGift(gift.code);
      setFormError(ex.message || "Payment failed. Try again.");
      setBusy(false);
    }
  }

  const back = () => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2));
  const count = items.reduce((n, l) => n + l.qty, 0);
  const totalLine = (
    <div className="flex items-center justify-between px-1 text-sm">
      <span className="font-semibold text-ink-2">{count} item{count === 1 ? "" : "s"} · free Lagos delivery</span>
      <span className="num text-base font-bold">{naira(toPay)}</span>
    </div>
  );
  const summary = (
    <div className="card sticky top-6 space-y-4 p-5">
      <p className="text-sm font-semibold text-ink-2">Your order</p>
      <ul className="space-y-3">
        {items.map((l) => (
          <li key={l.id} className="flex items-center gap-3 text-sm">
            <span className="relative h-12 w-12 shrink-0 rounded-xl bg-haze"><Image src={l.p.image} alt="" fill sizes="48px" className="object-contain p-1" /></span>
            <span className="min-w-0 flex-1"><span className="line-clamp-2 font-semibold">{l.p.name}</span><span className="text-mute">Qty {l.qty}</span></span>
            <span className="num font-semibold">{naira(l.p.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span className="num">{naira(subtotal)}</span></div>
        <div className="flex justify-between"><span>Delivery (Lagos)</span><span className="font-semibold text-sun-deep">Free</span></div>
        {giftUsed > 0 && <div className="flex justify-between text-leaf"><span>Gift card</span><span className="num">−{naira(giftUsed)}</span></div>}
        {f.installer && <div className="flex justify-between text-mute"><span>Installation</span><span>Quoted after order</span></div>}
        <div className="flex justify-between pt-2 text-lg font-semibold"><span>To pay</span><span className="num">{naira(toPay)}</span></div>
      </div>
      {ref && <p className="text-xs text-mute">Referred by <b>{ref}</b></p>}
    </div>
  );

  if (step === 1)
    return (
      <Flow step={1} total={3} onBack={back} aside={summary}
        title={other ? <>Who&apos;s it <span className="hl">for</span>?</> : <>Your <span className="hl">details</span></>}
        sub={other ? "We'll call them to arrange delivery." : "We call to confirm your order before delivery."}
        footer={<>{totalLine}<Next onClick={() => next(1)}>Next: delivery</Next></>}>
        {!me.user && <p className="text-sm text-mute">Have an account? <Link href="/account?next=/checkout" className="font-semibold text-ink underline">Sign in</Link> to fill this in for you.</p>}
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Who is this for?">
          {([["For me", false], ["For someone else", true]] as const).map(([l, v]) => (
            <button type="button" key={l} role="radio" aria-checked={other === v} onClick={() => setF((x) => ({ ...x, forSomeoneElse: v }))}
              className={`rounded-2xl border-[1.5px] p-4 text-left font-bold ${other === v ? "border-ink bg-mint-tint" : "border-transparent bg-paper"}`}>{l}</button>
          ))}
        </div>
        {other && (
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Their full name" error={errors.recipientName}><input className="field" autoComplete="off" value={f.recipientName} onChange={set("recipientName")} aria-invalid={!!errors.recipientName} /></Field>
            <Field label="Their phone number" error={errors.recipientPhone}><input className="field" type="tel" inputMode="tel" placeholder="0803 123 4567" value={f.recipientPhone} onChange={set("recipientPhone")} aria-invalid={!!errors.recipientPhone} /></Field>
            <Field label="A note for them (optional)" className="sm:col-span-2"><input className="field" maxLength={300} placeholder="No more NEPA wahala, Mum" value={f.giftMessage} onChange={set("giftMessage")} /></Field>
          </div>
        )}
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          {other && <p className="text-sm font-semibold text-ink-2 sm:col-span-2">About you</p>}
          <Field label="Full name" error={errors.name}><input className="field" autoComplete="name" value={f.name} onChange={set("name")} onBlur={captureLead} aria-invalid={!!errors.name} /></Field>
          <Field label={other ? "Your phone (any country, optional)" : "Phone number"} error={errors.phone}><input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder={other ? "+44 7700 900123" : "0803 123 4567"} value={f.phone} onChange={set("phone")} onBlur={captureLead} aria-invalid={!!errors.phone} /></Field>
          <Field label="Email" hint="For your receipt." error={errors.email} className="sm:col-span-2"><input className="field" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} onBlur={captureLead} aria-invalid={!!errors.email} /></Field>
          {more.alt || f.altPhone ? (
            <Field label="Another Nigerian number (optional)" error={errors.altPhone}><input className="field" type="tel" inputMode="tel" placeholder="0812 345 6789" value={f.altPhone} onChange={set("altPhone")} aria-invalid={!!errors.altPhone} /></Field>
          ) : <button type="button" onClick={() => setMore((m) => ({ ...m, alt: true }))} className="text-left text-sm font-semibold sm:col-span-2">+ Add another number</button>}
        </div>
        <p className="text-xs text-mute">If you don&apos;t finish, we may message you once on WhatsApp about this order. Nothing else.</p>
      </Flow>
    );

  if (step === 2)
    return (
      <Flow step={2} total={3} onBack={back} aside={summary}
        title={other ? <>Where should it <span className="hl">go</span>?</> : <>Where should we <span className="hl">deliver</span>?</>}
        sub="Free delivery anywhere in Lagos State."
        footer={<>{totalLine}<Next onClick={() => next(2)}>Next: payment</Next></>}>
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Local government area" error={errors.lga}>
            <select className="field" value={f.lga} onChange={set("lga")} aria-invalid={!!errors.lga}>
              <option value="">Choose the LGA</option>
              {LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Nearest landmark (optional)"><input className="field" maxLength={120} placeholder="e.g. opposite Shoprite" value={f.landmark} onChange={set("landmark")} /></Field>
          <Field label="Street address" error={errors.address} className="sm:col-span-2"><input className="field" maxLength={300} autoComplete="street-address" placeholder="House number, street, area" value={f.address} onChange={set("address")} aria-invalid={!!errors.address} /></Field>
          {more.notes || f.notes ? (
            <Field label="Delivery notes (optional)" className="sm:col-span-2"><textarea className="field" rows={2} maxLength={300} value={f.notes} onChange={set("notes")} /></Field>
          ) : <button type="button" onClick={() => setMore((m) => ({ ...m, notes: true }))} className="text-left text-sm font-semibold sm:col-span-2">+ Add a delivery note</button>}
        </div>
        <button type="button" role="switch" aria-checked={f.installer} onClick={() => setF((x) => ({ ...x, installer: !x.installer }))}
          className={`flex w-full items-center gap-4 rounded-3xl border-[1.5px] p-5 text-left ${f.installer ? "border-ink bg-mint-tint" : "border-transparent bg-paper"}`}>
          <span className="flex-1"><span className="block font-bold">Install it for {other ? "them" : "me"}</span><span className="text-sm text-ink-2">No charge now. We quote after the order and connect an engineer.</span></span>
          <span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${f.installer ? "justify-end bg-ink" : "justify-start bg-line"}`}><span className={`h-6 w-6 rounded-full ${f.installer ? "bg-mint" : "bg-white"}`} /></span>
        </button>
      </Flow>
    );

  return (
    <Flow step={3} total={3} onBack={back} label="Last step" aside={summary}
      title={<>Review and <span className="hl">pay</span></>}
      footer={
        <>
          {formError && <p role="alert" className="rounded-2xl bg-flare/10 p-3 text-sm text-flare">{formError}</p>}
          <Next icon="lock" busy={busy} disabled={toPay > 0 && !canPay} onClick={submit}>{toPay === 0 ? "Place order" : method === "paystack" ? `Pay ${naira(toPay)} with Paystack` : `Pay ${naira(toPay)}`}</Next>
          <p className="text-center text-xs text-mute">{method === "paystack" ? "Secured by Paystack." : "Secured by Stripe."} We call to confirm before delivery.</p>
        </>
      }>
      <div className="card space-y-2 p-5 text-sm lg:hidden">
        <div className="flex justify-between"><span>{count} item{count === 1 ? "" : "s"}</span><span className="num">{naira(subtotal)}</span></div>
        {giftUsed > 0 && <div className="flex justify-between text-leaf"><span>Gift card</span><span className="num">−{naira(giftUsed)}</span></div>}
        <div className="flex justify-between text-base font-semibold"><span>To pay</span><span className="num">{naira(toPay)}</span></div>
      </div>
      <div className="card flex items-start justify-between gap-4 p-5 text-sm">
        <span>
          <span className="block font-semibold">{other ? `For ${f.recipientName}` : f.name}</span>
          <span className="text-ink-2">{f.address}, {f.lga}{f.installer ? " · with installation" : ""}</span>
        </span>
        <button type="button" onClick={() => setStep(2)} className="shrink-0 font-semibold underline">Change</button>
      </div>

      {gift || more.gift ? (
        <div className="card p-5">
          {gift ? (
            <div className="flex items-center justify-between text-sm"><span>Gift card {gift.code} · {naira(gift.balance)}</span><button type="button" className="underline" disabled={busy} onClick={() => setGift(null)}>Remove</button></div>
          ) : (
            <div className="flex gap-2">
              <input className="field uppercase" placeholder="Gift card code" maxLength={20} value={giftInput} onChange={(e) => { setGiftInput(e.target.value); setGiftMsg(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyGift(); } }} aria-label="Gift card code" />
              <button type="button" className="btn btn-ghost shrink-0" disabled={giftBusy || busy} onClick={() => applyGift()}>{giftBusy ? "…" : "Apply"}</button>
            </div>
          )}
          {giftMsg && <p role="alert" className="mt-1 text-xs text-flare">{giftMsg}</p>}
        </div>
      ) : <button type="button" onClick={() => setMore((m) => ({ ...m, gift: true }))} className="text-sm font-semibold">+ Use a gift card</button>}

      <fieldset disabled={busy} className="min-w-0">
        {toPay === 0 ? <p className="rounded-2xl bg-mint-tint p-4 text-sm">Your gift card covers this order. No card needed.</p> : !opts ? (
          <p className="text-sm text-mute">Loading payment options…</p>
        ) : !opts.naira && !opts.intl ? (
          <p className="rounded-2xl bg-lemon-tint p-4 text-sm">We're not officially live yet, so online payments are off for now. To order,  <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}`}>message us on WhatsApp</a>.</p>
        ) : (
          <div className="card space-y-3 p-5">
            <PayWith options={opts} value={method} onChange={setMethod} disabled={busy} />
            {cards.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm text-mute">Your saved cards</legend>
                {cards.map((c) => (
                  <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] p-2 pr-4 ${choice === c.id ? "border-ink" : "border-line"}`}>
                    <input type="radio" name="card" className="ml-2 accent-[#17201B]" checked={choice === c.id} onChange={() => setCardChoice(c.id)} />
                    <div className="min-w-0 flex-1"><CardChip c={c} /></div>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] p-4 ${choice === "new" ? "border-ink" : "border-line"}`}>
                  <input type="radio" name="card" className="accent-[#17201B]" checked={choice === "new"} onChange={() => setCardChoice("new")} />
                  <span className="font-medium">{method === "paystack" ? "New card, bank transfer or USSD" : "Use a new card"}</span>
                </label>
              </fieldset>
            )}
            {!useSaved && method === "paystack" && (
              <div className="space-y-3 rounded-2xl bg-haze p-4">
                <p className="text-sm text-ink-2">You&apos;ll finish on Paystack&apos;s secure page with your card, a bank transfer or USSD, then come straight back here.</p>
                <SaveCard signedIn={!!me.user} saveCard={saveCard} setSaveCard={setSaveCard} nickname={f.cardNickname} onNickname={set("cardNickname")} note="Card payments only." />
              </div>
            )}
            {!useSaved && method === "stripe" && (stripeReady ? (
              <div className="space-y-4 rounded-2xl bg-haze p-4">
                <PaymentElement options={{ layout: "tabs" }} onReady={() => setCardReady(true)} onLoadError={() => setFormError("The card form couldn't load. Refresh the page and try again.")} />
                {!cardReady && <p className="text-sm text-mute">Loading the card form…</p>}
                <SaveCard signedIn={!!me.user} saveCard={saveCard} setSaveCard={setSaveCard} nickname={f.cardNickname} onNickname={set("cardNickname")} />
              </div>
            ) : <p className="rounded-2xl bg-lemon-tint p-4 text-sm">Cards from abroad aren&apos;t available right now. Pay in naira, or <a className="font-semibold underline" href={`https://wa.me/${STORE.whatsapp}`}>message us on WhatsApp</a>.</p>)}
          </div>
        )}
      </fieldset>
      <p className="text-center text-sm text-mute"><Link className="underline" href="/pay-small-small">Pay small small instead</Link> · <Link className="underline" href="/fund/new">Go Solar Me with friends</Link></p>
    </Flow>
  );
}

function SaveCard({ signedIn, saveCard, setSaveCard, nickname, onNickname, note }: { signedIn: boolean; saveCard: boolean; setSaveCard: (b: boolean) => void; nickname: string; onNickname: (e: React.ChangeEvent<HTMLInputElement>) => void; note?: string }) {
  if (!signedIn) return <p className="text-xs text-mute"><Link className="underline" href="/account?next=/checkout">Create an account</Link> to save and name cards.</p>;
  return (
    <>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[#17201B]" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
        <span>Save this card for next time{note ? <span className="text-mute"> · {note}</span> : null}</span>
      </label>
      {saveCard && <Field label="Name this card" hint="e.g. “GTB salary card” or “Business Visa”."><input className="field" maxLength={40} value={nickname} onChange={onNickname} placeholder="My card" /></Field>}
    </>
  );
}
