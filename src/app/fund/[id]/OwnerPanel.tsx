"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/client";
import { naira } from "@/lib/format";
import { ALL_TIERS } from "@/data/packages";
import { POOL } from "@/config/store";
import { Field } from "@/components/Field";

type P = { id: string; status: string; kind: string; raised: number; extended: boolean; needsAddress: boolean; choiceEnds: string | null };

/** Only the page owner sees this: add the address, extend, switch to a smaller kit, or close and refund. */
export function OwnerPanel({ pool }: { pool: P }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState("");
  const open = pool.status === "open" || pool.status === "ended";
  const smaller = pool.kind === "public" && pool.raised > 0 ? ALL_TIERS.filter((t) => t.price <= pool.raised).sort((a, b) => b.price - a.price).slice(0, 4) : [];

  async function act(key: string, body: Record<string, unknown>, done: (r: Record<string, unknown>) => string) {
    setBusy(key); setErr(""); setMsg("");
    try { const r = await api<Record<string, unknown>>(`/pools/${pool.id}/close`, { body }); setMsg(done(r)); setConfirm(""); router.refresh(); }
    catch (x) { setErr((x as Error).message); }
    setBusy("");
  }

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <p className="font-semibold">Your page</p>
      {pool.needsAddress && <AddressForm id={pool.id} onSaved={() => router.refresh()} />}
      {open && (
        <div className="space-y-3 text-sm">
          {pool.status === "ended" && <p className="rounded-lg bg-sun/20 p-3">The deadline has passed. Choose what happens next{pool.choiceEnds ? ` by ${new Date(pool.choiceEnds).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : ""}. If you don&apos;t, everyone is refunded automatically.</p>}
          {!pool.extended && (
            <button type="button" className="btn btn-ghost w-full !py-2 text-sm" disabled={!!busy} onClick={() => act("extend", { action: "extend" }, () => `Extended by ${POOL.extendDays} days.`)}>
              {busy === "extend" ? "Extending…" : `Extend the deadline by ${POOL.extendDays} days (once)`}
            </button>
          )}
          <p className="text-mute">To finish it yourself, chip in the rest using the form above.</p>
          {smaller.length > 0 && (
            <details className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer font-semibold">Switch to a kit the {naira(pool.raised)} covers</summary>
              <p className="mt-2 text-mute">We order it now. Anything left over becomes a gift card in your name, never cash.</p>
              <ul className="mt-2 space-y-2">
                {smaller.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0"><b>{t.name}</b> <span className="text-mute">· {t.segment.short}</span><span className="num block">{naira(t.price)}</span></span>
                    {confirm === t.id ? (
                      <button type="button" className="btn btn-sun shrink-0 !px-3 !py-1.5 text-xs" disabled={!!busy} onClick={() => act(t.id, { action: "smaller", items: t.lines.map((l) => ({ id: l.p.id, qty: l.qty })) }, (r) => `Ordered! ${r.leftover ? `${naira(Number(r.leftover))} left over is on gift card ${r.giftCard}.` : ""}`)}>{busy === t.id ? "Ordering…" : "Confirm"}</button>
                    ) : <button type="button" className="btn btn-ghost shrink-0 !px-3 !py-1.5 text-xs" onClick={() => setConfirm(t.id)}>Choose</button>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {confirm === "cancel" ? (
            <div className="rounded-lg border border-flare/40 p-3">
              <p>Close the page and refund everyone to their card? This can&apos;t be undone.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-ink !py-1.5 text-xs" disabled={!!busy} onClick={() => act("cancel", { action: "cancel" }, (r) => `Closed. ${r.refunded ?? 0} refund(s) sent${r.failed ? `, ${r.failed} need our attention (we'll handle them)` : ""}.`)}>{busy === "cancel" ? "Closing…" : "Yes, close and refund"}</button>
                <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => setConfirm("")}>Keep it open</button>
              </div>
            </div>
          ) : <button type="button" className="text-flare underline" onClick={() => setConfirm("cancel")}>Close the page and refund everyone</button>}
        </div>
      )}
      {msg && <p role="status" className="rounded-lg bg-leaf/10 p-3 text-sm">{msg}</p>}
      {err && <p role="alert" className="rounded-lg bg-flare/10 p-3 text-sm text-flare">{err}</p>}
    </div>
  );
}

function AddressForm({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [f, setF] = useState({ address: "", landmark: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <form noValidate className="space-y-2 rounded-lg bg-sun/15 p-3" onSubmit={async (e) => {
      e.preventDefault();
      if (f.address.replace(/\s/g, "").length < 8) { setErrors({ address: "House number, street, area." }); return; }
      setBusy(true);
      try { await api(`/pools/${id}/address`, { body: f }); onSaved(); } catch (x) { setErrors((x as ApiError).fields || { address: (x as Error).message }); }
      setBusy(false);
    }}>
      <p className="text-sm font-semibold">Add the delivery address</p>
      <p className="text-xs text-mute">Private: only we see it. Add it any time before delivery.</p>
      <Field label="Street address" error={errors.address}><input className="field" maxLength={300} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Landmark (optional)"><input className="field" maxLength={120} value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} /></Field>
      <button className="btn btn-ink w-full !py-2 text-sm" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
    </form>
  );
}
