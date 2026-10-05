"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CardChip, type Card } from "@/components/Header";
import { stripePromise, stripeAppearance } from "@/components/StripePay";
import { PayWith, usePayOptions, defaultProvider, goToPaystack, type Provider } from "@/components/PayWith";
import { api } from "@/lib/client";

export default function CardsPage() {
  const [data, setData] = useState<{ user: { email: string } | null; cards: Card[] } | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [adding, setAdding] = useState<{ secret: string } | null>(null);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState("");
  const opts = usePayOptions();
  const [picked, setPicked] = useState<Provider | null>(null);
  const method = picked ?? defaultProvider(opts);
  const load = useCallback(() => { setLoadErr(""); api<{ user: { email: string } | null; cards: Card[] }>("/me").then(setData).catch((e) => setLoadErr((e as Error).message)); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load
  useEffect(() => { load(); }, [load]);
  // Back from Paystack's card check: save the card (the ₦100 is refunded on our side).
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("reference");
    if (!ref) return;
    history.replaceState(null, "", "/account/cards");
    api("/cards/setup", { method: "PUT", body: { reference: ref } })
      .then(() => { setSaved("Card saved. The ₦100 check is on its way back to you."); load(); })
      .catch((e) => setMsg((e as Error).message));
  }, [load]);

  if (loadErr) return <Center><p className="text-flare">{loadErr}</p><button className="btn btn-ink mt-4" onClick={load}>Try again</button></Center>;
  if (!data) return <Center>Loading…</Center>;
  if (!data.user) return <Center><p>Sign in to see your saved cards.</p><Link href="/account?next=/account/cards" className="btn btn-ink mt-4">Sign in</Link></Center>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight">Saved cards</h1>
      <p className="mt-2 text-mute">{data.user.email}. Your newest card shows first and is picked by default at checkout.</p>
      {saved && <p role="status" className="mt-4 rounded-xl bg-leaf/10 p-3 text-sm">{saved}</p>}
      <ul className="mt-8 space-y-3">
        {data.cards.length === 0 && <li className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-mute">No saved cards yet. Add one below or tick “Save this card” at checkout.</li>}
        {data.cards.map((c, i) => <CardRow key={c.id} c={c} latest={i === 0} onChange={load} />)}
      </ul>

      <section className="mt-10 card p-6">
        <h2 className="font-display text-xl font-semibold">Add a card</h2>
        {!opts ? <p className="mt-2 text-sm text-mute">Loading…</p> : (!opts.naira && !opts.intl) || (method === "stripe" && !stripePromise) ? <p className="mt-2 text-sm text-mute">Card saving will be available once payments are switched on.</p> : !adding ? (
          <div className="mt-4 space-y-3">
            <PayWith options={opts} value={method} onChange={setPicked} disabled={busy} />
            {method === "paystack" && <p className="text-sm text-mute">Paystack checks the card with a ₦100 charge, which we refund straight away.</p>}
            <form noValidate className="flex flex-col gap-3 sm:flex-row" onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              if (!nick.trim()) { setMsg("Give the card a name, e.g. GTB salary card."); return; }
              setMsg(""); setBusy(true);
              try {
                const d = await api<{ clientSecret?: string; authorizationUrl?: string }>("/cards/setup", { body: { nickname: nick.trim(), provider: method } });
                if (d.authorizationUrl) { goToPaystack(d.authorizationUrl); return; }
                if (d.clientSecret) setAdding({ secret: d.clientSecret });
              } catch (x) { setMsg((x as Error).message); }
              setBusy(false);
            }}>
              <input className="field" placeholder="Name this card, e.g. GTB salary card" maxLength={40} value={nick} onChange={(e) => { setNick(e.target.value); setMsg(""); }} aria-label="Card name" />
              <button className="btn btn-ink shrink-0" disabled={busy}>{busy ? "…" : "Continue"}</button>
            </form>
          </div>
        ) : !stripePromise ? null : (
          <Elements stripe={stripePromise} options={{ clientSecret: adding.secret, appearance: stripeAppearance }}>
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
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="mt-4 space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!stripe || !elements || busy) return;
      setBusy(true); setErr("");
      try {
        const res = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: `${location.origin}/account/cards` } });
        if (res.error) { setErr(res.error.message || "Card was not saved."); setBusy(false); return; }
        await api("/cards/setup", { method: "PUT", body: { setupIntentId: res.setupIntent.id } }).catch(() => {});
        onDone();
      } catch { setErr("No connection. Check your internet and try again."); setBusy(false); }
    }}>
      <PaymentElement onReady={() => setReady(true)} />
      {!ready && <p className="text-sm text-mute">Loading the card form…</p>}
      {err && <p role="alert" className="text-sm text-flare">{err}</p>}
      <div className="flex gap-3">
        <button className="btn btn-sun" disabled={busy || !stripe || !ready}>{busy ? "Saving…" : "Save card"}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function CardRow({ c, latest, onChange }: { c: Card; latest: boolean; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(c.nickname);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr("");
    try { await fn(); onChange(); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <li className="rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-60"><CardChip c={c} /></div>
        {latest && <span className="rounded-full bg-sun px-2.5 py-1 text-xs font-semibold">Latest</span>}
        <button className="text-sm underline" onClick={() => setEdit((x) => !x)}>Rename</button>
        {confirm ? (
          <span className="flex items-center gap-2 text-sm">
            <button className="font-semibold text-flare underline" disabled={busy} onClick={() => run(() => api(`/cards/${c.id}`, { method: "DELETE" }))}>{busy ? "Removing…" : "Yes, remove"}</button>
            <button className="underline" onClick={() => setConfirm(false)}>Keep</button>
          </span>
        ) : <button className="text-sm text-flare underline" onClick={() => setConfirm(true)}>Remove</button>}
      </div>
      {edit && (
        <form className="mt-3 flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) { setErr("Give the card a name."); return; }
          await run(() => api(`/cards/${c.id}`, { method: "PATCH", body: { nickname: name.trim() } }));
          setEdit(false);
        }}>
          <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Card name" />
          <button className="btn btn-ink shrink-0 !py-2" disabled={busy}>{busy ? "…" : "Save name"}</button>
        </form>
      )}
      {err && <p role="alert" className="mt-2 text-sm text-flare">{err}</p>}
    </li>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-20 text-center">{children}</div>;
}
