"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CardChip } from "@/components/Header";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;
type Card = { id: string; brand: string; last4: string; nickname: string; expMonth: number; expYear: number };

export default function CardsPage() {
  const [data, setData] = useState<{ user: { email: string } | null; cards: Card[] } | null>(null);
  const [adding, setAdding] = useState<{ secret: string; nickname: string } | null>(null);
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => fetch("/api/me").then((r) => r.json()).then(setData), []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Center>Loading…</Center>;
  if (!data.user) return <Center><p>Sign in to see your saved cards.</p><Link href="/account?next=/account/cards" className="btn btn-ink mt-4">Sign in</Link></Center>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight">Saved cards</h1>
      <p className="mt-2 text-mute">{data.user.email}. Your newest card shows first and is picked by default at checkout.</p>
      <ul className="mt-8 space-y-3">
        {data.cards.length === 0 && <li className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-mute">No saved cards yet. Add one below or tick “Save this card” at checkout.</li>}
        {data.cards.map((c, i) => <CardRow key={c.id} c={c} latest={i === 0} onChange={load} />)}
      </ul>

      <section className="mt-10 rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-xl font-semibold">Add a card</h2>
        {!stripePromise ? <p className="mt-2 text-sm text-mute">Card saving will be available once payments are switched on.</p> : !adding ? (
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={async (e) => {
            e.preventDefault(); setMsg("");
            const r = await fetch("/api/cards/setup-intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: nick }) });
            const d = await r.json();
            if (!r.ok) return setMsg(d.error);
            setAdding({ secret: d.clientSecret, nickname: nick });
          }}>
            <input className="field" placeholder="Name this card, e.g. Business Mastercard" maxLength={40} value={nick} onChange={(e) => setNick(e.target.value)} required aria-label="Card name" />
            <button className="btn btn-ink shrink-0">Continue</button>
          </form>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret: adding.secret, appearance: { theme: "stripe", variables: { colorPrimary: "#10213B", borderRadius: "10px" } } }}>
            <AddCard onDone={() => { setAdding(null); setNick(""); load(); }} onCancel={() => setAdding(null)} />
          </Elements>
        )}
        {msg && <p role="alert" className="mt-3 text-sm text-flare">{msg}</p>}
      </section>
    </div>
  );
}

function AddCard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="mt-4 space-y-4" onSubmit={async (e) => {
      e.preventDefault(); if (!stripe || !elements) return;
      setBusy(true); setErr("");
      const res = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: `${location.origin}/account/cards` } });
      if (res.error) { setErr(res.error.message || "Card was not saved."); setBusy(false); return; }
      await fetch("/api/cards/setup-intent", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupIntentId: res.setupIntent.id }) });
      setBusy(false); onDone();
    }}>
      <PaymentElement />
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
      <div className="flex gap-3">
        <button className="btn btn-sun" disabled={busy || !stripe}>{busy ? "Saving…" : "Save card"}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function CardRow({ c, latest, onChange }: { c: Card; latest: boolean; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.nickname);
  const [busy, setBusy] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1"><CardChip c={c} /></div>
        {latest && <span className="rounded-full bg-sun px-2.5 py-1 text-xs font-semibold">Latest</span>}
        <button className="text-sm underline" onClick={() => setEdit((x) => !x)}>Rename</button>
        <button className="text-sm text-flare underline" disabled={busy} onClick={async () => {
          if (!window.confirm(`Remove ${c.nickname}?`)) return;
          setBusy(true); await fetch(`/api/cards/${c.id}`, { method: "DELETE" }); onChange();
        }}>Remove</button>
      </div>
      {edit && (
        <form className="mt-3 flex gap-2" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          await fetch(`/api/cards/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: name }) });
          setBusy(false); setEdit(false); onChange();
        }}>
          <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Card name" />
          <button className="btn btn-ink shrink-0 !py-2" disabled={busy}>Save name</button>
        </form>
      )}
    </li>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-20 text-center">{children}</div>;
}
