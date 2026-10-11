"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { REGIONS } from "@/config/store";
import { QUESTIONS } from "@/data/engineer-survey";
import { ago } from "../ui";

type AI = {
  score?: number; verdict?: string; summary?: string; strengths?: string[]; concerns?: string[]; photos?: string; error?: string;
  tests?: { test_sizing: number; test_wiring: number };
};
type R = {
  id: string; name: string; phone: string; email: string; region: string; years: string; jobs_per_month: string; team_size: string;
  answers: Record<string, string>; photos: string[]; voice: string[]; ai: AI; decision: string; decided_by: string; notified_at: string | null;
  created_at: string; installer_active: boolean | null;
};
type Count = { name: string; n: number };
type Insights = { candidates: number; premiumBrands: Count[]; budgetBrands: Count[]; refusedBrands: Count[]; quoteChecks: Count[]; installBungalow: string[]; installStorey: string[]; forgottenItems: { item: string; cost: string }[]; setupDays: string[]; appMustDo: string[] };
type Sent = { id: string; name: string; decision: string; emailed: boolean; wa: string };

const file = (p: string) => `/api/v1/admin/file?p=${encodeURIComponent(p)}`;
const region = (k: string) => REGIONS.find((r) => r.key === k)?.label ?? "Area not given";
const DECISION: Record<string, { label: string; cls: string }> = {
  pending: { label: "Being screened", cls: "bg-haze text-mute" },
  review: { label: "Needs a look", cls: "bg-lemon-tint text-ink" },
  shortlisted: { label: "Shortlisted", cls: "bg-mint-tint text-sun-deep" },
  declined: { label: "Not now", cls: "bg-flare/10 text-flare" },
};

/** Installer interviews: AI screening, the team's decision, and what the strongest installers agree on. */
export default function Research() {
  const [list, setList] = useState<R[] | null>(null);
  const [ins, setIns] = useState<Insights | null>(null);
  const [tab, setTab] = useState<"people" | "insights">("people");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(() => api<{ responses: R[]; insights: Insights }>("/admin/research").then((r) => { setList(r.responses); setIns(r.insights); }).catch((e) => setErr((e as Error).message)), []);
  useEffect(() => { load(); }, [load]);
  // While anything is still being screened, check again every 15 seconds.
  useEffect(() => { if (!list?.some((r) => r.decision === "pending" && !r.ai.error)) return; const t = setTimeout(load, 15000); return () => clearTimeout(t); }, [list, load]);

  const act = async (b: Record<string, unknown>) => {
    setBusy(true); setErr("");
    try { const r = await api<{ responses: R[]; sent?: Sent[] }>("/admin/research", { body: b }); setList(r.responses); if (r.sent) setSent(r.sent); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const copy = () => navigator.clipboard.writeText(`${window.location.origin}/engineers`).then(() => setCopied(true)).catch(() => {});
  const waiting = list?.filter((r) => (r.decision === "shortlisted" || r.decision === "declined") && !r.notified_at).length ?? 0;
  const sorted = [...(list ?? [])].sort((a, b) => Number(!!a.notified_at) - Number(!!b.notified_at) || (b.ai.score ?? -1) - (a.ai.score ?? -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Installer interviews</h1><p className="text-sm text-mute">The AI marks each interview and makes a call. Check it, then send. Nobody hears anything until you press Send.</p></div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-ghost" href="/engineers" target="_blank" rel="noopener">Open the interview</a>
          <button className="btn btn-ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
          <button className="btn btn-ink" disabled={busy || !waiting} onClick={() => act({ action: "send" })}>{waiting ? `Send ${waiting} decision${waiting === 1 ? "" : "s"}` : "Nothing to send"}</button>
        </div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}

      {sent && sent.length > 0 && (
        <div className="space-y-2 rounded-3xl bg-paper p-5">
          <p className="font-semibold">Sent. Now send each one on WhatsApp</p>
          <p className="text-sm text-mute">Our WhatsApp number can&apos;t message first yet, so each button opens WhatsApp with the message ready.</p>
          {sent.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-haze px-3 py-2 text-sm">
              <span>{s.name} · {DECISION[s.decision]?.label}{s.emailed ? " · emailed" : ""}</span>
              <a className="btn btn-ink !py-1 text-xs" href={s.wa} target="_blank" rel="noopener">WhatsApp</a>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button aria-pressed={tab === "people"} onClick={() => setTab("people")} className="chip">Candidates{list ? ` · ${list.length}` : ""}</button>
        <button aria-pressed={tab === "insights"} onClick={() => setTab("insights")} className="chip">What strong installers say</button>
      </div>

      {!list ? <p className="text-mute">Loading…</p> : tab === "insights" ? <InsightsView i={ins} /> : !list.length ? (
        <div className="rounded-3xl bg-paper p-8 text-center text-mute">No interviews yet. Copy the link and share it in installer groups.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const d = DECISION[r.decision] ?? DECISION.pending;
            return (
              <article key={r.id} className="space-y-3 rounded-3xl bg-paper p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-mute">{region(r.region)} · {r.years || "years ?"} · {r.team_size || "team ?"} · {r.jobs_per_month || "?"} jobs/month · {ago(r.created_at)}</p>
                    <p className="text-xs"><a className="underline" href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">{r.phone}</a>{r.email && <> · {r.email}</>}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof r.ai.score === "number" && <span className="num rounded-full bg-night px-2.5 py-1 text-xs font-bold text-white">{r.ai.score}/100</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${d.cls}`}>{d.label}{r.decided_by === "ai" ? " (AI)" : ""}{r.notified_at ? " · sent" : ""}</span>
                  </div>
                </div>
                {r.ai.error ? <p className="text-sm text-flare">Screening failed: {r.ai.error}</p> : r.ai.summary && (
                  <div className="space-y-1 text-sm">
                    <p>{r.ai.summary}</p>
                    {r.ai.tests && <p className="text-xs text-mute">Sizing test {r.ai.tests.test_sizing}/10 · wiring test {r.ai.tests.test_wiring}/10 · photos: {r.ai.photos}</p>}
                    {!!r.ai.concerns?.length && <p className="text-xs text-flare">Concerns: {r.ai.concerns.join("; ")}</p>}
                    {!!r.ai.strengths?.length && <p className="text-xs text-sun-deep">Strengths: {r.ai.strengths.join("; ")}</p>}
                  </div>
                )}
                {r.photos.length > 0 && (
                  <div className="flex gap-2">
                    {r.photos.map((p) => (
                      <a key={p} href={file(p)} target="_blank" rel="noopener" className="block h-20 w-20 overflow-hidden rounded-xl bg-haze">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private file served through our admin route */}
                        <img src={file(p)} alt="Install photo" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">Answers{r.voice.length ? ` · ${r.voice.length} voice note${r.voice.length === 1 ? "" : "s"}` : ""}</summary>
                  <dl className="mt-3 space-y-3 text-sm">
                    {QUESTIONS.filter((q) => r.answers[q.key]).map((q) => <div key={q.key}><dt className="font-medium">{q.test ? "Test: " : ""}{q.q}</dt><dd className="mt-1 whitespace-pre-wrap text-ink-2">{r.answers[q.key]}</dd></div>)}
                  </dl>
                  {r.voice.length > 0 && <div className="mt-3 space-y-2">{r.voice.map((v) => <audio key={v} controls preload="none" src={file(v)} className="w-full" />)}</div>}
                </details>
                {!r.notified_at && (
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy || r.decision === "shortlisted"} className="btn btn-ink !py-1.5 text-xs" onClick={() => act({ action: "decide", id: r.id, decision: "shortlisted" })}>Shortlist</button>
                    <button disabled={busy || r.decision === "declined"} className="btn btn-ghost !py-1.5 text-xs" onClick={() => act({ action: "decide", id: r.id, decision: "declined" })}>Not now</button>
                    <button disabled={busy} className="btn btn-ghost !py-1.5 text-xs" onClick={() => act({ action: "rescreen", id: r.id })}>Mark again</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightsView({ i }: { i: Insights | null }) {
  if (!i || !i.candidates) return <div className="rounded-3xl bg-paper p-8 text-center text-mute">This fills in from shortlisted installers and anyone the AI scores 70 or more.</div>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-mute">From {i.candidates} strong installer{i.candidates === 1 ? "" : "s"}. Use this to pick brands for each budget, set install fees and add the items quotes keep missing.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Counts title="Recommended, good budget" rows={i.premiumBrands} />
        <Counts title="Recommended, low budget" rows={i.budgetBrands} />
        <Counts title="Refuse to install" rows={i.refusedBrands} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Lines title="Install fee, bungalow" rows={i.installBungalow} />
        <Lines title="Install fee, storey building" rows={i.installStorey} />
      </div>
      <Lines title="Items quotes forget, with cost" rows={i.forgottenItems.map((f) => `${f.item}${f.cost ? ` · ${f.cost}` : ""}`)} />
      <div className="grid gap-3 md:grid-cols-2">
        <Counts title="What they check first in a quote" rows={i.quoteChecks} />
        <Lines title="Time to finish a typical setup" rows={i.setupDays} />
      </div>
      <Lines title="What the app must do" rows={i.appMustDo} />
    </div>
  );
}

function Counts({ title, rows }: { title: string; rows: Count[] }) {
  return (
    <div className="rounded-3xl bg-paper p-5">
      <p className="font-semibold">{title}</p>
      {rows.length ? <ul className="mt-2 space-y-1 text-sm">{rows.map((r) => <li key={r.name} className="flex justify-between gap-3"><span>{r.name}</span><span className="num text-mute">{r.n}</span></li>)}</ul> : <p className="mt-2 text-sm text-mute">Nothing yet.</p>}
    </div>
  );
}
function Lines({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-3xl bg-paper p-5">
      <p className="font-semibold">{title}</p>
      {rows.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{rows.map((r, n) => <li key={n}>{r}</li>)}</ul> : <p className="mt-2 text-sm text-mute">Nothing yet.</p>}
    </div>
  );
}
