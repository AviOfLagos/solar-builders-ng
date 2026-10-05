"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartLines } from "@/components/CartDrawer";
import { Field } from "@/components/Field";
import { GoogleButton } from "@/components/GoogleButton";
import { Flow, Next, Option } from "@/components/ui/Flow";
import { api, getRef, type ApiError } from "@/lib/client";
import { naira, firstName, isName, NG_PHONE, normalizePhone } from "@/lib/format";
import { LAGOS_LGAS, OCCASIONS, POOL, type Occasion } from "@/config/store";

const FOR = [
  { key: "me", label: "Me" }, { key: "mum", label: "My mum", name: "Mum" }, { key: "dad", label: "My dad", name: "Dad" },
  { key: "house", label: "Our house" }, { key: "shop", label: "My shop" }, { key: "church", label: "Our church" }, { key: "other", label: "Someone else" },
] as const;
type Me = { user: { name: string; phone: string } | null };
const TOTAL = 4;

/**
 * Start a Go Solar Me page, one question per screen (same as the app):
 * 1. how people pay  2. who it's for (or the squad)  3. the page  4. delivery
 */
export default function NewFund() {
  const { items, subtotal } = useCartLines();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Me["user"] | undefined>(undefined);
  const [loadErr, setLoadErr] = useState("");
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<"public" | "squad">("public");
  const [forKey, setForKey] = useState<(typeof FOR)[number]["key"]>("me");
  const [forName, setForName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("just-because");
  const [days, setDays] = useState(POOL.defaultDays);
  const [people, setPeople] = useState<string[]>(["", ""]);
  const [d, setD] = useState({ recipientName: "", recipientPhone: "", lga: "", address: "", landmark: "", installer: true });
  const [custom, setCustom] = useState({ title: "", story: "" });
  const [writeOwn, setWriteOwn] = useState(false);
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

  const exit = () => router.back();
  if (!mounted || user === undefined) return <div className="mx-auto max-w-xl px-4 py-16 text-mute">Loading…</div>;
  if (!items.length)
    return (
      <Flow step={1} total={1} onBack={exit} label="" title="Pick the kit first." sub="Three quick questions find the right one. Then come back here to let people chip in.">
        <Link href="/find" className="btn btn-ink w-full">Find my kit</Link>
        <Link href="/packages" className="btn btn-ghost w-full">See all packages</Link>
      </Flow>
    );
  if (!user)
    return (
      <Flow step={1} total={TOTAL} onBack={exit} label="Before we start" title="Sign in to start your page." sub="So you can manage it and we can reach you when it's funded. Chipping in never needs an account.">
        {loadErr && <p role="alert" className="text-sm text-flare">{loadErr}</p>}
        <div className="card space-y-4 p-6">
          <GoogleButton next="/fund/new" />
          <Link href="/account?mode=signup&next=/fund/new" className="btn btn-ghost w-full">Use email instead</Link>
          <p className="text-center text-sm text-mute">Already have an account? <Link href="/account?next=/fund/new" className="font-semibold text-ink underline">Sign in</Link></p>
        </div>
      </Flow>
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
  const back = () => (step > 1 ? setStep(step - 1) : exit());

  function checkWho() {
    const e: Record<string, string> = {};
    if (kind === "public" && !isName(forName)) e.forName = "A first name is enough.";
    if (kind === "squad" && share < 1000) e.shares = "Each share must be at least ₦1,000. Use fewer people.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function validate() {
    const e: Record<string, string> = {};
    if (!isName(d.recipientName)) e.recipientName = "Who receives the kit?";
    if (!NG_PHONE.test(normalizePhone(d.recipientPhone))) e.recipientPhone = "The Nigerian number we call for delivery.";
    if (!d.lga) e.lga = "Pick the LGA.";
    if (d.address && d.address.replace(/\s/g, "").length < 8) e.address = "Enter the full address, or leave it for later.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  async function create() {
    if (busy) return;
    setMsg("");
    if (!validate()) return;
    setBusy(true);
    try {
      const r = await api<{ path: string }>("/pools", {
        body: {
          kind, forName: kind === "squad" ? forName || firstName(user!.name) : forName, occasion, deadlineDays: days, title: custom.title, story: custom.story, ref: getRef(),
          items: items.map((l) => ({ id: l.id, qty: l.qty })), ...d,
          shares: kind === "squad" ? people.map((p, i) => ({ name: p.trim() || `Person ${i + 1}` })) : undefined,
        },
      });
      router.push(r.path);
    } catch (x) {
      const ex = x as ApiError;
      const f = ex.fields || {};
      setMsg(ex.message); setErrors(f); setBusy(false);
      if (f.forName || f.shares) setStep(2);
    }
  }

  const preview = (
    <div className="card sticky top-6 overflow-hidden">
      <div className="bg-night p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-mint">Your page preview</p>
        <p className="font-display mt-2 text-2xl">{title}</p>
      </div>
      <div className="space-y-3 p-5">
        <p className="line-clamp-4 text-sm text-ink-2">{story}</p>
        <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full w-[3%] rounded-full bg-mint-deep" /></div>
        <p className="num text-sm"><b>₦0</b> of {naira(subtotal)} · {days} days</p>
      </div>
    </div>
  );

  if (step === 1)
    return (
      <Flow step={1} total={TOTAL} onBack={back} title={<>How should people <span className="hl">pay</span>?</>} sub="Money comes to us, never to anyone's account, and only becomes solar."
        footer={<Next onClick={() => setStep(2)}>{kind === "squad" ? "Next: your squad" : "Next: who it's for"}</Next>} aside={preview}>
        <div role="radiogroup" className="space-y-3">
          <Option icon="megaphone" title="Anyone chips in" sub="Family, friends, even strangers. Any amount." on={kind === "public"} onClick={() => setKind("public")} />
          <Option icon="split" title="Split with my squad" sub="Housemates or siblings. Fixed equal shares, a pay button each." on={kind === "squad"} onClick={() => setKind("squad")} />
        </div>
        <div className="flex items-center justify-between rounded-3xl bg-paper p-5"><span className="text-ink-2">Goal · {items.length} {items.length === 1 ? "item" : "items"}</span><span className="num text-2xl font-light">{naira(subtotal)}</span></div>
      </Flow>
    );

  if (step === 2)
    return kind === "squad" ? (
      <Flow step={2} total={TOTAL} onBack={back} title="Who's in the squad?" sub="Names are optional. Each person gets their own pay button."
        footer={<Next onClick={() => checkWho() && setStep(3)}>Next: your page</Next>} aside={preview}>
        <div className="card space-y-2 p-4">
          {people.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="field" maxLength={40} placeholder={i === 0 ? "You" : `Person ${i + 1}`} value={p} onChange={(e) => setPeople(people.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Person ${i + 1}`} />
              <span className="num w-28 shrink-0 text-right text-sm font-semibold">{naira(share)}</span>
              {n > POOL.squadMin && <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-haze" aria-label="Remove" onClick={() => setPeople(people.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
          {n < POOL.squadMax && <button type="button" className="w-full rounded-xl py-3 text-sm font-semibold hover:bg-haze" onClick={() => setPeople([...people, ""])}>+ Add a person</button>}
        </div>
        {errors.shares && <p role="alert" className="text-sm text-flare">{errors.shares}</p>}
      </Flow>
    ) : (
      <Flow step={2} total={TOTAL} onBack={back} title="Who is it for?" sub="It shapes the page. You can edit the words next."
        footer={<Next onClick={() => checkWho() && setStep(3)}>Next: your page</Next>} aside={preview}>
        <div className="flex flex-wrap gap-2">{FOR.map((k) => <Chip key={k.key} on={forKey === k.key} onClick={() => pickFor(k)}>{k.label}</Chip>)}</div>
        <Field label="Their first name" error={errors.forName}><input className="field" maxLength={40} value={forName} onChange={(e) => setForName(e.target.value)} placeholder="e.g. Mama Tunde" /></Field>
      </Flow>
    );

  if (step === 3)
    return (
      <Flow step={3} total={TOTAL} onBack={back} title="What's the occasion?" sub="We write the page for you. Change anything you like."
        footer={<Next onClick={() => { setErrors({}); setStep(4); }}>Next: delivery</Next>} aside={preview}>
        <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <Chip key={o.slug} on={occasion === o.slug} onClick={() => setOccasion(o.slug)}>{o.label}</Chip>)}</div>
        <p className="pt-2 text-sm font-semibold">How long should it run?</p>
        <div className="flex flex-wrap gap-2">{POOL.deadlineDays.map((x) => <Chip key={x} on={days === x} onClick={() => setDays(x)}>{x} days</Chip>)}</div>
        <div className="card space-y-2 p-5 lg:hidden">
          <p className="font-display text-xl">{title}</p>
          <p className="text-sm text-ink-2">{story}</p>
        </div>
        {writeOwn ? (
          <div className="space-y-3">
            <Field label="Title"><input className="field" maxLength={80} value={custom.title} placeholder={title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} /></Field>
            <Field label="Story"><textarea className="field" rows={4} maxLength={1000} value={custom.story} placeholder={story} onChange={(e) => setCustom({ ...custom, story: e.target.value })} /></Field>
          </div>
        ) : (
          <button type="button" onClick={() => setWriteOwn(true)} className="text-sm font-semibold underline underline-offset-4">Write your own title or story</button>
        )}
      </Flow>
    );

  return (
    <Flow step={4} total={TOTAL} onBack={back} title="Where should it go?" sub="We deliver free in Lagos once it's funded. The public page shows only the LGA."
      footer={<>
        {msg && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{msg}</p>}
        <Next icon="sparkle" busy={busy} onClick={create}>Create my page</Next>
      </>} aside={preview}>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="Who receives it" error={errors.recipientName}><input className="field" maxLength={80} value={d.recipientName} onChange={(e) => setD({ ...d, recipientName: e.target.value })} /></Field>
        <Field label="Their phone" hint="We call this number to deliver." error={errors.recipientPhone}><input className="field" type="tel" inputMode="tel" placeholder="0803 123 4567" value={d.recipientPhone} onChange={(e) => setD({ ...d, recipientPhone: e.target.value })} /></Field>
        <Field label="LGA in Lagos" error={errors.lga}><select className="field" value={d.lga} onChange={(e) => setD({ ...d, lga: e.target.value })}><option value="">Choose the LGA</option>{LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Landmark (optional)"><input className="field" maxLength={120} value={d.landmark} onChange={(e) => setD({ ...d, landmark: e.target.value })} /></Field>
        <Field label="Street address (optional now)" hint="You can add it once the kit is funded." error={errors.address} className="sm:col-span-2"><input className="field" maxLength={300} value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} /></Field>
      </fieldset>
      <Option icon="tools" title="Ask for an installer too" sub="Quoted separately. You decide later." on={d.installer} onClick={() => setD({ ...d, installer: !d.installer })} />
    </Flow>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className="chip">{children}</button>;
}
