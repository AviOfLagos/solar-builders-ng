"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { REGIONS } from "@/config/store";
import { SURVEY } from "@/data/engineer-survey";
import { ago } from "../ui";

type R = { id: string; name: string; phone: string; region: string; years: string; jobs_per_month: string; answers: Record<string, string>; join_list: boolean; installer_active: boolean | null; created_at: string };
const QUESTIONS = SURVEY.flatMap((s) => s.questions);

/** Installer research: who answered the /engineers questions, and what they said. */
export default function Research() {
  const [list, setList] = useState<R[] | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"people" | "question">("question");
  const [copied, setCopied] = useState(false);
  useEffect(() => { api<{ responses: R[] }>("/admin/research").then((r) => setList(r.responses)).catch((e) => setErr((e as Error).message)); }, []);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/engineers`;
  const copy = () => navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Installer research</h1><p className="text-sm text-mute">Answers from the installer questions. Share the link in installer groups and communities.</p></div>
        <div className="flex gap-2"><a className="btn btn-ghost" href="/engineers" target="_blank" rel="noopener">Open the questions</a><button className="btn btn-ink" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button></div>
      </div>
      {err && <p className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      <div className="flex gap-2"><button aria-pressed={view === "question"} onClick={() => setView("question")} className="chip">By question</button><button aria-pressed={view === "people"} onClick={() => setView("people")} className="chip">By person</button></div>
      {!list ? <p className="text-mute">Loading…</p> : !list.length ? <div className="rounded-3xl bg-paper p-8 text-center text-mute">No answers yet. Copy the link and share it with installers.</div>
        : view === "question" ? (
          <div className="space-y-3">
            {QUESTIONS.map((q) => {
              const rows = list.filter((r) => r.answers[q.key]);
              return (
                <details key={q.key} className="rounded-3xl bg-paper p-5" open={rows.length > 0 && rows.length < 4}>
                  <summary className="cursor-pointer font-semibold">{q.q} <span className="font-normal text-mute">· {rows.length}</span></summary>
                  <ul className="mt-3 space-y-2 text-sm">{rows.map((r) => <li key={r.id} className="rounded-xl bg-haze p-3"><p className="whitespace-pre-wrap">{r.answers[q.key]}</p><p className="mt-1 text-xs text-mute">{r.name}</p></li>)}</ul>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <details key={r.id} className="rounded-3xl bg-paper p-5">
                <summary className="cursor-pointer"><span className="font-semibold">{r.name}</span> <span className="text-sm text-mute">· {REGIONS.find((x) => x.key === r.region)?.label ?? "area not given"} · {r.years || "?"} · {r.jobs_per_month || "?"} jobs/month · {ago(r.created_at)}{r.join_list ? (r.installer_active ? " · on installer list" : " · wants to join (inactive in Installers)") : ""}</span></summary>
                <p className="mt-2 text-sm"><a className="underline" href={`https://wa.me/${r.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener">{r.phone}</a></p>
                <dl className="mt-3 space-y-3 text-sm">{QUESTIONS.filter((q) => r.answers[q.key]).map((q) => <div key={q.key}><dt className="font-medium">{q.q}</dt><dd className="mt-1 whitespace-pre-wrap text-ink-2">{r.answers[q.key]}</dd></div>)}</dl>
              </details>
            ))}
          </div>
        )}
    </div>
  );
}
