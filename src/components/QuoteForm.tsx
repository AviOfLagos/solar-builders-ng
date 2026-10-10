"use client";
import { useState } from "react";
import { Field } from "./Field";
import { api, getLeadId, setLeadId } from "@/lib/client";
import { LAGOS_LGAS, SITE_QUESTIONS } from "@/config/store";
import type { Load } from "@/lib/sizing";

type Site = { building: string; use: string; roof: string; changeover: string; earthing: string; panelRunM: string; lga: string; notes: string };
const BLANK: Site = { building: "", use: "home", roof: "", changeover: "", earthing: "", panelRunM: "", lga: "", notes: "" };

/**
 * "Get an exact quote": the questions an engineer would ask, answered up front, so the quote that
 * comes back needs no back-and-forth. Posts to the shared /api/v1/quote (the same one other sites use).
 */
export function QuoteForm({ load, hours, segment, items }: { load: Partial<Load>; hours: number; segment?: string; items: { id: string; qty: number }[] }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Site>(BLANK);
  const [who, setWho] = useState({ name: "", phone: "", consent: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof Site) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value });
  const ready = s.building && s.lga && who.phone.replace(/\D/g, "").length >= 10;

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api<{ id: string | null }>("/quote", { body: { id: getLeadId(), ...who, load, hours, segment, items, from: "solar.nexprove.com/find", site: { ...s, panelRunM: Number(s.panelRunM) || 0 } } });
      if (r.id) setLeadId(r.id);
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  if (done) return <div className="card p-5"><p className="font-semibold">Got it.</p><p className="mt-1 text-sm text-ink-2">We&apos;ll confirm the equipment price with the supplier and send your exact quote on WhatsApp. Installation is quoted separately by our engineer.</p></div>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-ghost w-full">Get an exact quote for my house</button>;

  const sel = (k: keyof typeof SITE_QUESTIONS, label: string) => (
    <Field label={label}><select className="field" value={s[k]} onChange={set(k)}><option value="">Choose…</option>{SITE_QUESTIONS[k].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
  );
  return (
    <div className="card space-y-4 p-5">
      <div><p className="font-semibold">A few details about the place</p><p className="text-sm text-mute">These are what an installer asks first. Answer them now and your quote comes back complete.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sel("building", "Type of building")}
        {sel("use", "Home or business")}
        <Field label="Area (LGA)"><select className="field" value={s.lga} onChange={set("lga")}><option value="">Choose…</option>{LAGOS_LGAS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        {sel("roof", "Roof type")}
        {sel("changeover", "Generator changeover in place?")}
        {sel("earthing", "Earthing already installed?")}
        <Field label="Roof to inverter spot (metres)" hint="Rough guess is fine"><input className="field" inputMode="numeric" value={s.panelRunM} onChange={set("panelRunM")} placeholder="e.g. 15" /></Field>
        <Field label="Anything else?"><input className="field" value={s.notes} onChange={set("notes")} placeholder="e.g. 3rd floor, borehole pump" /></Field>
        <Field label="Your name"><input className="field" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} autoComplete="name" /></Field>
        <Field label="WhatsApp number"><input className="field" inputMode="tel" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} autoComplete="tel" placeholder="0803 123 4567" /></Field>
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" checked={who.consent} onChange={(e) => setWho({ ...who, consent: e.target.checked })} className="mt-0.5" />Message me on WhatsApp about this quote</label>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <button disabled={!ready || busy} onClick={submit} className="btn btn-ink w-full">{busy ? "Sending…" : "Send my quote request"}</button>
      <p className="text-xs text-mute">Systems are sized with about 25% headroom over what you listed. Equipment price is confirmed with the supplier before you pay.</p>
    </div>
  );
}
