"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { Share } from "@/components/Share";
import { useCartLines } from "@/components/CartDrawer";
import { Field } from "@/components/Field";

type Dash = {
  store: { slug: string; name: string; kind: string; commission_bps: number } | null;
  stats?: { orders: number; sales: number; earned: number };
  recent?: { id: string; subtotal: number; commission: number; status: string; created_at: string }[];
  builds?: { id: string; title: string; items: unknown[]; views: number }[];
};

export default function StoreDash() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const load = () => api<Dash>("/me/store").then(setD).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);
  if (err) return <Center><p>{err}</p><Link className="btn btn-ink mt-4" href="/account?next=/account/store">Sign in</Link></Center>;
  if (!d) return <Center><p className="text-mute">Loading…</p></Center>;
  if (!d.store) return <Center><p>You don't have a store yet.</p><Link className="btn btn-ink mt-4" href="/sell">Open your store</Link></Center>;
  const s = d.store;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm text-mute">{s.kind === "installer" ? "Installer store" : "Store"} · you earn {(s.commission_bps / 100).toFixed(1)}% on sales</p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">{s.name}</h1>
      <div className="mt-4"><Share path={`/s/${s.slug}`} text={`Get genuine solar delivered in Lagos through my store, ${s.name}:`} /></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders through you" value={String(d.stats?.orders ?? 0)} />
        <Stat label="Sales" value={naira(d.stats?.sales ?? 0)} />
        <Stat label="You've earned" value={naira(d.stats?.earned ?? 0)} highlight />
      </div>
      <NewBuild onCreated={load} />
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Your shared builds</h2>
        {!d.builds?.length ? <p className="mt-2 text-sm text-mute">None yet. Add products to your cart and share a build for a client.</p> : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">{d.builds.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-4 text-sm"><Link href={`/b/${b.id}`} className="font-medium underline">{b.title || "Untitled build"}</Link><span className="text-mute">{b.items.length} items · {b.views} views</span></li>
          ))}</ul>
        )}
      </section>
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Recent orders</h2>
        {!d.recent?.length ? <p className="mt-2 text-sm text-mute">No orders yet. Share your link to get started.</p> : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">{d.recent.map((o) => (
            <li key={o.id} className="flex justify-between p-4 text-sm"><span><b>{o.id}</b> · {o.status}</span><span className="num">{naira(o.subtotal)} → <b>{naira(o.commission)}</b></span></li>
          ))}</ul>
        )}
        <p className="mt-3 text-xs text-mute">Commission is paid out after delivery. Payout setup comes with the seller dashboard.</p>
      </section>
    </div>
  );
}

function NewBuild({ onCreated }: { onCreated: () => void }) {
  const { items, subtotal } = useCartLines();
  const [f, setF] = useState({ title: "", note: "" });
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  return (
    <section className="mt-10 rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">Share a build with a client</h2>
      {!items.length ? <p className="mt-2 text-sm text-mute">Your cart is empty. <Link className="underline" href="/packages">Add a package</Link> or products, then come back here.</p> : link ? (
        <div className="mt-3"><p className="mb-2 text-sm">Send this link to your client:</p><Share path={link} text={`Here's the solar setup I recommend: ${f.title}`} /></div>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={async (e) => { e.preventDefault(); setErr(""); try { const r = await api<{ path: string }>("/builds", { body: { ...f, items: items.map((l) => ({ id: l.id, qty: l.qty })) } }); setLink(r.path); onCreated(); } catch (x) { setErr((x as Error).message); } }}>
          <p className="text-sm text-mute">From your cart: {items.length} items, {naira(subtotal)}</p>
          <Field label="Title"><input className="field" maxLength={80} placeholder="e.g. 5kVA for Mrs Ade, Lekki" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Note to client (optional)"><textarea className="field" rows={3} maxLength={500} placeholder="What it powers, and that installation is extra." value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          {err && <p className="text-sm text-flare">{err}</p>}
          <button className="btn btn-ink">Create link</button>
        </form>
      )}
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl p-4 ${highlight ? "bg-sun" : "border border-line bg-paper"}`}><p className="text-sm">{label}</p><p className="font-display num mt-1 text-2xl font-bold">{value}</p></div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-20 text-center">{children}</div>;
}
