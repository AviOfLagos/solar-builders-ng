"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartLines } from "@/components/CartDrawer";
import { Field, Section } from "@/components/Field";
import { GoogleButton } from "@/components/GoogleButton";
import { api, getRef, type ApiError } from "@/lib/client";
import { naira, firstName, isName, NG_PHONE, normalizePhone } from "@/lib/format";
import { LAGOS_LGAS, OCCASIONS, POOL, type Occasion } from "@/config/store";

const FOR = [
  { key: "me", label: "Me" }, { key: "mum", label: "My mum", name: "Mum" }, { key: "dad", label: "My dad", name: "Dad" },
  { key: "house", label: "Our house" }, { key: "shop", label: "My shop" }, { key: "church", label: "Our church" }, { key: "other", label: "Someone else" },
] as const;
type Me = { user: { name: string; phone: string } | null };

export default function NewFund() {
  const { items, subtotal } = useCartLines();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Me["user"] | undefined>(undefined);
  const [loadErr, setLoadErr] = useState("");
  const [kind, setKind] = useState<"public" | "squad">("public");
  const [forKey, setForKey] = useState<(typeof FOR)[number]["key"]>("me");
  const [forName, setForName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("just-because");
  const [days, setDays] = useState(POOL.defaultDays);
  const [people, setPeople] = useState<string[]>(["", ""]);
  const [d, setD] = useState({ recipientName: "", recipientPhone: "", lga: "", address: "", landmark: "", installer: true });
  const [custom, setCustom] = useState({ title: "", story: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cart lives in localStorage, so render only after mount
    setMounted(true);
    if (new URLSearchParams(location.search).get("kind") === "squad") setKind("squad");
    api<Me>("/me").then((m) => {
      setUser(m.user);
      if (m.user) {
        setForName(firstName(m.user.name));
        setPeople([firstName(m.user.name), ""]);
        setD((x) => ({ ...x, recipientName: m.user!.name, recipientPhone: m.user!.phone || "" }));
      }
    }).catch((e) => { setLoadErr((e as Error).message); setUser(null); });
  }, []);

  if (!mounted || user === undefined) return <div className="mx-auto max-w-3xl px-4 py-16 text-mute">Loading…</div>;
  if (!items.length) return <Empty title="Pick the kit first" text="Choose a package or add products to your cart, then come back to start your Go Solar Me page." />;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Sign in to start your page</h1>
        <p className="mt-3 text-ink-2">So you can manage it and we can reach you when it&apos;s funded.</p>
        {loadErr && <p className="mt-3 text-sm text-flare">{loadErr}</p>}
        <div className="mt-6 flex flex-col items-center gap-3">
          <GoogleButton onDone={() => location.reload()} />
          <Link href="/account?next=/fund/new" className="text-sm underline">Use email instead</Link>
        </div>
      </div>
    );

  const pickFor = (k: (typeof FOR)[number]) => {
    setForKey(k.key);
    const me = firstName(user.name);
    setForName("name" in k ? k.name : k.key === "me" || k.key === "house" || k.key === "shop" || k.key === "church" ? me : "");
    if (k.key === "me" || k.key === "house" || k.key === "shop") setD((x) => ({ ...x, recipientName: user.name, recipientPhone: user.phone || "" }));
    else setD((x) => ({ ...x, recipientName: "", recipientPhone: "" }));
  };

  const shownName = forName.trim() || "them";
  const title = custom.title || (kind === "squad" ? `${firstName(user.name)}'s squad goes solar` : forKey === "house" ? "Help our house go solar" : forKey === "shop" ? `Help ${shownName}'s shop go solar` : forKey === "church" ? "Help our church go solar" : `Help ${shownName} go solar`);
  const story = custom.story || OCCASIONS.find((o) => o.slug === occasion)!.story(shownName);
  const n = people.length;
  const share = Math.floor(subtotal / n);

  function validate() {
    const e: Record<string, string> = {};
    if (!isName(forName)) e.forName = "A first name is enough.";
    if (!isName(d.recipientName)) e.recipientName = "Who receives the kit?";
    if (!NG_PHONE.test(normalizePhone(d.recipientPhone))) e.recipientPhone = "The Nigerian number we call for delivery.";
    if (!d.lga) e.lga = "Pick the LGA.";
    if (d.address && d.address.replace(/\s/g, "").length < 8) e.address = "Enter the full address, or leave it for later.";
    if (kind === "squad" && share < 1000) e.shares = "Each share must be at least ₦1,000. Use fewer people.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold text-sun-deep">Go Solar Me</p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">Fund this kit together</h1>
      <p className="mt-2 text-ink-2">Takes about a minute. Money goes to us, never to anyone&apos;s account, and only becomes solar.</p>
      <form noValidate className="mt-8 space-y-6" onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setMsg("");
        if (!validate()) { setMsg("Check the highlighted fields."); return; }
        setBusy(true);
        try {
          const r = await api<{ path: string }>("/pools", {
            body: {
              kind, forName, occasion, deadlineDays: days, title: custom.title, story: custom.story, ref: getRef(),
              items: items.map((l) => ({ id: l.id, qty: l.qty })), ...d,
              shares: kind === "squad" ? people.map((p, i) => ({ name: p.trim() || `Person ${i + 1}` })) : undefined,
            },
          });
          router.push(r.path);
        } catch (x) { const ex = x as ApiError; setMsg(ex.message); setErrors(ex.fields || {}); setBusy(false); }
      }}>
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <Section title="How should people pay?">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {([["public", "Anyone chips in", "Family, friends, even strangers. Any amount."], ["squad", "Split with my squad", "Housemates or siblings. Fixed equal shares."]] as const).map(([k, l, t]) => (
                <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-xl border p-4 text-left ${kind === k ? "border-ink bg-sun/15" : "border-line"}`}>
                  <span className="block font-semibold">{l}</span><span className="text-sm text-mute">{t}</span>
                </button>
              ))}
            </div>
            {kind === "squad" && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-mute">Names are optional. Each person gets their own pay button.</p>
                {people.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="field" maxLength={40} placeholder={i === 0 ? "You" : `Person ${i + 1}`} value={p} onChange={(e) => setPeople(people.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Person ${i + 1}`} />
                    <span className="num w-28 shrink-0 text-right text-sm">{naira(share)}</span>
                    {n > POOL.squadMin && <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-haze" aria-label="Remove" onClick={() => setPeople(people.filter((_, j) => j !== i))}>✕</button>}
                  </div>
                ))}
                {n < POOL.squadMax && <button type="button" className="text-sm font-semibold underline" onClick={() => setPeople([...people, ""])}>+ Add a person</button>}
                {errors.shares && <p className="text-sm text-flare">{errors.shares}</p>}
              </div>
            )}
          </Section>

          <Section title="Who is it for?">
            <div className="flex flex-wrap gap-2">
              {FOR.map((k) => <Chip key={k.key} on={forKey === k.key} onClick={() => pickFor(k)}>{k.label}</Chip>)}
            </div>
            <Field label="Their first name" error={errors.forName} className="mt-4"><input className="field" maxLength={40} value={forName} onChange={(e) => setForName(e.target.value)} placeholder="e.g. Mama Tunde" /></Field>
            <p className="mb-2 mt-5 text-sm font-medium">Occasion</p>
            <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <Chip key={o.slug} on={occasion === o.slug} onClick={() => setOccasion(o.slug)}>{o.label}</Chip>)}</div>
            <p className="mb-2 mt-5 text-sm font-medium">Deadline</p>
            <div className="flex flex-wrap gap-2">{POOL.deadlineDays.map((x) => <Chip key={x} on={days === x} onClick={() => setDays(x)}>{x} days</Chip>)}</div>
          </Section>

          <Section title="Delivery">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Who receives it" error={errors.recipientName}><input className="field" maxLength={80} value={d.recipientName} onChange={(e) => setD({ ...d, recipientName: e.target.value })} /></Field>
              <Field label="Their phone" hint="We call this number to deliver." error={errors.recipientPhone}><input className="field" type="tel" inputMode="tel" placeholder="0803 123 4567" value={d.recipientPhone} onChange={(e) => setD({ ...d, recipientPhone: e.target.value })} /></Field>
              <Field label="LGA in Lagos" error={errors.lga}><select className="field" value={d.lga} onChange={(e) => setD({ ...d, lga: e.target.value })}><option value="">Choose the LGA</option>{LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}</select></Field>
              <Field label="Landmark (optional)"><input className="field" maxLength={120} value={d.landmark} onChange={(e) => setD({ ...d, landmark: e.target.value })} /></Field>
              <Field label="Street address (optional now)" hint="You can add it once the kit is funded." error={errors.address} className="sm:col-span-2"><input className="field" maxLength={300} value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} /></Field>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#10213B]" checked={d.installer} onChange={(e) => setD({ ...d, installer: e.target.checked })} /> Ask for an installer too (quoted separately)</label>
            <p className="mt-3 text-xs text-mute">The address and phone stay private. The public page shows only the LGA.</p>
          </Section>

          <Section title="Your page">
            <p className="font-display text-2xl font-semibold">{title}</p>
            <p className="mt-2 text-ink-2">{story}</p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold underline">Write your own title or story</summary>
              <div className="mt-3 space-y-3">
                <Field label="Title"><input className="field" maxLength={80} value={custom.title} placeholder={title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} /></Field>
                <Field label="Story"><textarea className="field" rows={4} maxLength={1000} value={custom.story} placeholder={story} onChange={(e) => setCustom({ ...custom, story: e.target.value })} /></Field>
              </div>
            </details>
          </Section>
        </fieldset>

        <div className="flex items-center justify-between rounded-xl bg-paper p-4"><span>{items.length} {items.length === 1 ? "item" : "items"} · goal</span><span className="font-display num text-2xl font-bold">{naira(subtotal)}</span></div>
        {msg && <p role="alert" className="rounded-lg bg-flare/10 p-3 text-sm text-flare">{msg}</p>}
        <button className="btn btn-sun w-full text-base" disabled={busy}>{busy ? "Creating…" : "Create my Go Solar Me page"}</button>
      </form>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full border px-4 py-2 text-sm ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>{children}</button>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-ink-2">{text}</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn btn-sun">Use the calculator</Link><Link href="/packages" className="btn btn-ghost">See packages</Link></div>
    </div>
  );
}
