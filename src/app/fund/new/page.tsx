"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartLines } from "@/components/CartDrawer";
import { Field, Section } from "@/components/Field";
import { api, getRef } from "@/lib/client";
import { naira } from "@/lib/format";
import { LAGOS_LGAS } from "@/config/store";

const OCCASIONS = ["Birthday", "For my parents", "Housewarming", "Wedding gift", "Shared flat", "Church / school", "Just because"];

export default function NewFund() {
  const { items, subtotal } = useCartLines();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string } | null | undefined>(undefined);
  const [f, setF] = useState({ title: "", occasion: "", story: "", forSomeoneElse: false, name: "", recipientName: "", recipientPhone: "", phone: "", address: "", lga: "", landmark: "", installer: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMounted(true); api<{ user: { name: string } | null }>("/me").then((m) => { setUser(m.user); if (m.user) setF((x) => ({ ...x, name: m.user!.name })); }); }, []);
  if (!mounted || user === undefined) return <div className="mx-auto max-w-3xl px-4 py-16 text-mute">Loading…</div>;
  if (!items.length) return <Empty title="Pick what to fund first" text="Add a package or products to your cart, then come back to start a funding page." />;
  if (!user) return <Empty title="Sign in to start a funding page" text="We need an account so you can manage the page and we can reach you." href="/account?next=/fund/new" cta="Sign in or create account" />;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Fund it with friends</h1>
      <p className="mt-2 text-ink-2">Create a public page for this kit. Anyone with the link can chip in any amount. When it reaches {naira(subtotal)}, we order and deliver.</p>
      <form className="mt-8 space-y-6" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setMsg(""); setErrors({});
        try {
          const d = await api<{ path: string }>("/pools", { body: { ...f, items: items.map((l) => ({ id: l.id, qty: l.qty })), ref: getRef() } });
          router.push(d.path);
        } catch (x) { const ex = x as Error & { fields?: Record<string, string> }; setMsg(ex.message); setErrors(ex.fields || {}); setBusy(false); }
      }}>
        <Section title="Your page">
          <div className="space-y-4">
            <Field label="Title" error={errors.title}><input className="field" maxLength={80} placeholder="e.g. Solar for Mum's house in Ikorodu" value={f.title} onChange={set("title")} /></Field>
            <Field label="Occasion"><select className="field" value={f.occasion} onChange={set("occasion")}><option value="">Choose one (optional)</option>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Why it matters (optional)"><textarea className="field" rows={4} maxLength={1000} placeholder="A few lines people will read before they chip in." value={f.story} onChange={set("story")} /></Field>
          </div>
        </Section>
        <Section title="Where it's going">
          <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#10213B]" checked={f.forSomeoneElse} onChange={set("forSomeoneElse")} /> It's for someone else</label>
          <div className="grid gap-4 sm:grid-cols-2">
            {f.forSomeoneElse ? (
              <>
                <Field label="Their name" error={errors.recipientName}><input className="field" value={f.recipientName} onChange={set("recipientName")} /></Field>
                <Field label="Their phone" error={errors.recipientPhone}><input className="field" type="tel" value={f.recipientPhone} onChange={set("recipientPhone")} /></Field>
              </>
            ) : <Field label="Your phone" error={errors.phone} className="sm:col-span-2"><input className="field" type="tel" placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} /></Field>}
            <Field label="Address in Lagos" error={errors.address} className="sm:col-span-2"><input className="field" value={f.address} onChange={set("address")} /></Field>
            <Field label="LGA" error={errors.lga}><select className="field" value={f.lga} onChange={set("lga")}><option value="">Choose the LGA</option>{LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}</select></Field>
            <Field label="Landmark (optional)"><input className="field" value={f.landmark} onChange={set("landmark")} /></Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#10213B]" checked={f.installer} onChange={set("installer")} /> Include an installer request (quoted separately)</label>
          <p className="mt-3 text-xs text-mute">The address stays private. The public page only shows the LGA.</p>
        </Section>
        <div className="flex items-center justify-between rounded-xl bg-paper p-4"><span>{items.length} items · goal</span><span className="font-display num text-2xl font-bold">{naira(subtotal)}</span></div>
        {msg && <p role="alert" className="text-sm text-flare">{msg}</p>}
        <button className="btn btn-sun w-full" disabled={busy}>{busy ? "Creating…" : "Create funding page"}</button>
      </form>
    </div>
  );
}

function Empty({ title, text, href = "/packages", cta = "See packages" }: { title: string; text: string; href?: string; cta?: string }) {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-3xl font-bold">{title}</h1><p className="mt-3 text-ink-2">{text}</p><Link href={href} className="btn btn-ink mt-6">{cta}</Link></div>;
}
