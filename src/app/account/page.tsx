"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

type Me = { user: { email: string; name: string } | null; store: { slug: string; name: string } | null };
type Mine = { orders: { id: string; total_paid: number; status: string; created_at: string; recipient: { name: string } | null }[]; pools: { id: string; title: string; goal: number; raised: number; status: string }[] };

function Account() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "";
  const [me, setMe] = useState<Me | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<{ msg: string; fields?: Record<string, string> }>({ msg: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api<Me>("/me").then((m) => { setMe(m); if (m.user) api<Mine>("/me/orders").then(setMine).catch(() => {}); });
  useEffect(() => { load(); }, []);

  if (!me) return <Wrap><p className="text-mute">Loading…</p></Wrap>;

  if (me.user)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">Hi, {me.user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-mute">{me.user.email}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Tile href="/account/cards" title="Saved cards" text="Name, remove or add cards." />
          <Tile href={me.store ? "/account/store" : "/sell"} title={me.store ? "My store" : "Sell & earn"} text={me.store ? `/s/${me.store.slug}` : "Open your store and earn on sales."} />
          <Tile href="/fund/new" title="Fund with friends" text="Let others chip in for a kit." />
        </div>
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">My funding pages</h2>
          {!mine?.pools.length ? <p className="mt-2 text-sm text-mute">None yet.</p> : (
            <ul className="mt-3 space-y-2">{mine.pools.map((p) => (
              <li key={p.id}><Link href={`/fund/${p.id}`} className="flex justify-between rounded-xl border border-line bg-paper p-4 hover:border-ink"><span>{p.title}</span><span className="num text-sm">{naira(p.raised)} / {naira(p.goal)} · {p.status}</span></Link></li>
            ))}</ul>
          )}
        </section>
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">My orders</h2>
          {!mine?.orders.length ? <p className="mt-2 text-sm text-mute">No orders yet.</p> : (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">{mine.orders.map((o) => (
              <li key={o.id} className="flex justify-between p-4 text-sm"><span><b>{o.id}</b>{o.recipient ? ` · for ${o.recipient.name}` : ""}</span><span className="num">{naira(o.total_paid)} · {o.status}</span></li>
            ))}</ul>
          )}
        </section>
        <button className="btn btn-ghost mt-10" onClick={async () => { await api("/auth/logout", { method: "POST" }); setMe({ user: null, store: null }); }}>Sign out</button>
      </div>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Wrap title={mode === "login" ? "Sign in" : "Create your account"} intro="Save cards, open a store, start a funding page and track orders.">
      <form className="mt-6 space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr({ msg: "" });
        try {
          await api(mode === "login" ? "/auth/login" : "/auth/register", { body: f });
          if (next.startsWith("/")) router.push(next); else load();
        } catch (x) { const ex = x as Error & { fields?: Record<string, string> }; setErr({ msg: ex.message, fields: ex.fields }); }
        setBusy(false);
      }}>
        {mode === "register" && <Field label="Full name" error={err.fields?.name}><input className="field" autoComplete="name" value={f.name} onChange={set("name")} required /></Field>}
        <Field label="Email" error={err.fields?.email}><input className="field" type="email" autoComplete="email" value={f.email} onChange={set("email")} required /></Field>
        {mode === "register" && <Field label="Phone (optional)"><input className="field" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></Field>}
        <Field label="Password" error={err.fields?.password}><input className="field" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={f.password} onChange={set("password")} required /></Field>
        {err.msg && <p role="alert" className="text-sm text-flare">{err.msg}</p>}
        <button className="btn btn-ink w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button className="font-semibold underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr({ msg: "" }); }}>{mode === "login" ? "Create an account" : "Sign in"}</button>
      </p>
    </Wrap>
  );
}

function Tile({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="rounded-xl border border-line bg-paper p-4 hover:border-ink"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-mute">{text}</span></Link>;
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{children}{error && <span className="mt-1 block text-flare">{error}</span>}</label>;
}
function Wrap({ title, intro, children }: { title?: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
        {title && <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>}
        {intro && <p className="mt-2 text-ink-2">{intro}</p>}
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Account /></Suspense>;
}
