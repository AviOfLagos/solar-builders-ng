"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { announceSignIn, announceSignOut, api, safeNext, type ApiError } from "@/lib/client";
import { naira, isEmail, isName, NG_PHONE, normalizePhone } from "@/lib/format";
import { GoogleButton } from "@/components/GoogleButton";
import { Field } from "@/components/Field";
import { Icon } from "@/components/ui/Icon";
import { ROLES, useJourney } from "@/lib/journey";

type Me = { user: { email: string; name: string; google?: boolean; verified?: boolean } | null; store: { slug: string; name: string } | null; team?: boolean };
type Order = { id: string; total_paid: number; gift_card_used: number; status: string; statusLabel: string; created_at: string; recipient: { name: string } | null; pool_id: string | null; delivery: { lga: string; address: string } };
type Pool = { id: string; kind: string; title: string; goal: number; raised: number; status: string; deadline: string };
type Mine = { orders: Order[]; pools: Pool[] };

const TRACK = ["confirmed", "out_for_delivery", "delivered", "installed"] as const;
const TRACK_LABEL = ["Confirmed", "On the way", "Delivered", "Installed"];
const POOL_LABEL: Record<string, string> = { open: "Open", ended: "Deadline passed: choose next step", funded: "Funded", cancelled: "Closed and refunded" };

function Account() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const googleError = params.get("error") === "google_taken" ? "That email is already linked to a different Google account." : params.get("error") === "google" ? "Google sign-in didn't go through. Try again, or use email." : "";
  const [me, setMe] = useState<Me | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [mine, setMine] = useState<Mine | null>(null);
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "signup" ? "register" : "login");
  const [hint, setHint] = useState("");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<{ msg: string; fields?: Record<string, string> }>({ msg: "" });
  const [busy, setBusy] = useState(false);
  const role = useJourney((s) => s.role);
  const myRole = ROLES.find((r) => r.key === role);

  const load = useCallback(() => {
    setLoadErr("");
    api<Me>("/me")
      .then((m) => { setMe(m); if (m.user) api<Mine>("/me/orders").then(setMine).catch(() => setMine({ orders: [], pools: [] })); })
      .catch((e) => setLoadErr((e as Error).message));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load of the signed-in state
  useEffect(() => { load(); }, [load]);

  const signedIn = () => { announceSignIn(); if (next) router.push(safeNext(next)); else load(); };

  if (loadErr) return <Wrap title="Couldn't load your account"><p className="mt-3 text-flare">{loadErr}</p><button className="btn btn-ink mt-4" onClick={load}>Try again</button></Wrap>;
  if (!me) return <Wrap><p className="text-mute">Loading…</p></Wrap>;

  if (me.user)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-5xl">Hi, <span className="hl">{me.user.name.split(" ")[0]}</span></h1>
        <p className="mt-2 text-mute">{me.user.email}</p>
        <Link href="/start?step=role" className="mt-6 flex items-center gap-4 rounded-3xl bg-night p-5 text-white">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-ink"><Icon name={myRole?.icon ?? "sparkle"} /></span>
          <span className="flex-1"><span className="block text-sm text-white/60">I&apos;m here to…</span><span className="block font-bold">{myRole?.title ?? "Tell us what brings you here"}</span></span>
          <span className="text-sm font-semibold text-mint">Change</span>
        </Link>
        {me.user.verified === false && <VerifyBanner email={me.user.email} />}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile href="/fund/new" icon="megaphone" title="Go Solar Me" text="Let family and friends fund a kit." />
          <Tile href="/account/cards" icon="card" title="Saved cards" text="Name, remove or add cards." />
          <Tile href={me.store ? "/account/store" : "/sell"} icon="tools" title={me.store ? "My store" : "Sell & earn"} text={me.store ? `/s/${me.store.slug}` : "Open your store and earn on sales."} />
          {me.team && <Tile href="/team" icon="shield" title="Team" text="Leads, orders, refunds." />}
        </div>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">My Go Solar Me pages</h2>
          {!mine ? <p className="mt-2 text-sm text-mute">Loading…</p> : !mine.pools.length ? <p className="mt-2 text-sm text-mute">None yet. <Link className="underline" href="/fund/new">Start one</Link>.</p> : (
            <ul className="mt-3 space-y-2">{mine.pools.map((p) => (
              <li key={p.id}><Link href={`/fund/${p.id}`} className="card flex flex-wrap justify-between gap-2 p-4 hover:shadow-[0_8px_24px_rgba(23,32,27,0.08)]"><span className="min-w-0 font-medium">{p.title}</span><span className="num text-sm text-mute">{naira(p.raised)} of {naira(p.goal)} · {POOL_LABEL[p.status] ?? p.status}</span></Link></li>
            ))}</ul>
          )}
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">My orders</h2>
          {!mine ? <p className="mt-2 text-sm text-mute">Loading…</p> : !mine.orders.length ? <p className="mt-2 text-sm text-mute">No orders yet.</p> : (
            <ul className="card mt-3 divide-y divide-line">{mine.orders.map((o) => (
              <li key={o.id} className="p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span><b>{o.id}</b>{o.recipient ? ` · for ${o.recipient.name}` : ""}{o.pool_id ? " · Go Solar Me" : ""} · {o.delivery.lga}</span>
                  <span className="num">{naira(o.total_paid + o.gift_card_used)}</span>
                </div>
                {TRACK.includes(o.status as (typeof TRACK)[number]) && <Track status={o.status} />}
                <p className="mt-2 text-mute">{o.statusLabel}{o.pool_id && !o.delivery.address ? " · add the delivery address on your page" : ""}</p>
                {["pending", "confirmed", "out_for_delivery", "delivered", "installed"].includes(o.status) && (
                  <p className="mt-2 text-xs"><a className="underline" href={`/api/v1/share/order/${o.id}?f=story`} target="_blank" rel="noopener">Share picture</a></p>
                )}
              </li>
            ))}</ul>
          )}
        </section>
        <button className="btn btn-ghost mt-10" onClick={async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); announceSignOut(); setMe({ user: null, store: null }); setMine(null); }}>Sign out</button>
      </div>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF((x) => ({ ...x, [k]: e.target.value })); setErr((x) => ({ ...x, fields: { ...x.fields, [k]: "" } })); };
  function validate() {
    const e: Record<string, string> = {};
    if (mode === "register" && !isName(f.name)) e.name = "Enter your name.";
    if (!isEmail(f.email.trim())) e.email = "Enter a valid email.";
    if (mode === "register" && f.phone && !NG_PHONE.test(normalizePhone(f.phone))) e.phone = "Enter a Nigerian number or leave it empty.";
    if (mode === "register" ? f.password.length < 8 || f.password.length > 128 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password) : !f.password) e.password = mode === "register" ? "Use 8+ characters with a letter and a number." : "Enter your password.";
    setErr({ msg: Object.keys(e).length ? "Check the highlighted fields." : "", fields: e });
    return !Object.keys(e).length;
  }
  return (
    <Wrap title={mode === "login" ? "Sign in" : "Create your account"} intro="Track orders, save cards, start a Go Solar Me page or open a store.">
      <div className="mt-6"><GoogleButton next={safeNext(next)} /></div>
      {googleError && <p role="alert" className="mt-2 text-center text-sm text-flare">{googleError}</p>}
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <p className="my-4 text-center text-xs uppercase tracking-wide text-mute">or with email</p>}
      <form noValidate className="mt-2 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !validate()) return;
        setBusy(true);
        try {
          await api(mode === "login" ? "/auth/login" : "/auth/register", { body: { ...f, email: f.email.trim() } });
          // A brand-new account goes through the same short onboarding as the app.
          if (mode === "register" && !next) router.push("/start?step=role&new=1"); else signedIn();
        } catch (x) {
          const ex = x as ApiError;
          // No account yet: keep what they typed and turn the form into sign-up. Already registered: the reverse.
          if (ex.code === "no_account") { setMode("register"); setErr({ msg: "" }); setHint("There's no account with this email yet. Add your name to create one. Your password stays as typed."); }
          else if (ex.code === "account_exists") { setMode("login"); setErr({ msg: "" }); setHint("You already have an account with this email. Sign in instead."); }
          else setErr({ msg: ex.message, fields: ex.fields });
        }
        setBusy(false);
      }}>
        {hint && <p className="rounded-2xl bg-lemon-tint p-3 text-sm">{hint}</p>}
        {mode === "register" && <Field label="Full name" error={err.fields?.name}><input className="field" autoComplete="name" maxLength={80} value={f.name} onChange={set("name")} /></Field>}
        <Field label="Email" error={err.fields?.email}><input className="field" type="email" inputMode="email" autoComplete="email" maxLength={120} value={f.email} onChange={set("email")} /></Field>
        {mode === "register" && <Field label="Phone (optional)" error={err.fields?.phone}><input className="field" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></Field>}
        <Field label="Password" error={err.fields?.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}><input className="field" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} value={f.password} onChange={set("password")} /></Field>
        {err.msg && <p role="alert" className="text-sm text-flare">{err.msg}</p>}
        <button className="btn btn-ink w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        {mode === "register" && <p className="text-center text-xs text-mute">By creating an account you confirm you are 18 or older and agree to our <Link className="underline" href="/legal/terms">Terms</Link> and <Link className="underline" href="/legal/privacy">Privacy Policy</Link>.</p>}
      </form>
      <p className="mt-4 text-center text-sm">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button className="font-semibold underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr({ msg: "" }); setHint(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button>
      </p>
      {mode === "login" && <p className="mt-2 text-center text-xs text-mute"><Link className="underline" href="/account/reset">Forgot your password?</Link></p>}
    </Wrap>
  );
}

function Tile({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="card block p-4 hover:shadow-[0_8px_24px_rgba(23,32,27,0.08)]">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-haze"><Icon name={icon} size={20} /></span>
      <span className="mt-3 block font-semibold">{title}</span><span className="mt-1 block text-sm text-mute">{text}</span>
    </Link>
  );
}
/** Where the order is, as four dots on a line (same as the app). */
function Track({ status }: { status: string }) {
  const at = TRACK.indexOf(status as (typeof TRACK)[number]);
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Order progress">
      {TRACK_LABEL.map((l, i) => (
        <li key={l} className="space-y-1.5">
          <span className={`block h-1.5 rounded-full ${i <= at ? "bg-mint-deep" : "bg-line"}`} />
          <span className={`block text-[11px] font-semibold ${i <= at ? "text-ink" : "text-mute"}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}
function Wrap({ title, intro, children }: { title?: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6 sm:p-8">
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

function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "err">("idle");
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lemon-tint p-4 text-sm">
      <p>Confirm your email. We sent a link to <b>{email}</b>.</p>
      {state === "sent" ? <span className="font-semibold">Sent. Check your inbox.</span> : (
        <button disabled={state === "busy"} className="btn btn-ghost !py-2 text-sm" onClick={async () => { setState("busy"); try { await api("/auth/verify", { method: "POST", body: {} }); setState("sent"); } catch { setState("err"); } }}>
          {state === "err" ? "Try again" : "Send it again"}
        </button>
      )}
    </div>
  );
}
