"use client";
import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import { Icon } from "@/components/ui/Icon";

const STARTERS = [
  "How did sales do this week vs last week?",
  "Which orders are late?",
  "Who should we follow up today?",
  "How are the Go Solar Me pages doing?",
  "Where are visitors coming from?",
];

/** Tiny markdown: **bold**, line breaks, and "- " lists. Enough for short answers. */
function Text({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => {
        const bullet = /^\s*[-*•]\s+/.test(l);
        const body = l.replace(/^\s*[-*•]\s+/, "").split(/(\*\*[^*]+\*\*)/).map((s, j) => (s.startsWith("**") ? <b key={j}>{s.slice(2, -2)}</b> : s));
        if (!l.trim()) return null;
        return bullet ? <p key={i} className="flex gap-2"><span aria-hidden>•</span><span>{body}</span></p> : <p key={i}>{body}</p>;
      })}
    </div>
  );
}

export function Chat() {
  const agent = useEveAgent();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const msgs = agent.data.messages;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, agent.status]);
  const send = (t: string) => { const m = t.trim(); if (!m || agent.status === "resuming") return; setDraft(""); void agent.send(m, busy ? { turnPolicy: "steer" } : undefined); };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col rounded-3xl bg-paper">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-night text-mint"><Icon name="sparkle" size={19} /></span>
          <div><p className="font-semibold">Ops assistant</p><p className="text-xs text-mute">Reads orders, leads, pages and traffic. Can&apos;t change anything yet.</p></div>
        </div>
        {msgs.length > 0 && <button onClick={() => agent.reset()} className="rounded-xl bg-haze px-3 py-2 text-sm font-semibold">New chat</button>}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {msgs.length === 0 ? (
          <div className="mx-auto max-w-lg pt-10 text-center">
            <p className="font-display text-3xl">What do you want to know?</p>
            <p className="mt-2 text-sm text-mute">Ask about sales, late orders, leads or Go Solar Me pages.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="chip">{s}</button>)}</div>
          </div>
        ) : msgs.filter((m) => m.parts.some((p) => p.type === "text" && p.text.trim())).map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-night text-white" : "bg-haze"}`}>
              {m.parts.map((p, i) => (p.type === "text" ? <Text key={p.id ?? i} text={p.text} /> : null))}
            </div>
          </div>
        ))}
        {busy && <p className="flex items-center gap-2 text-sm text-mute"><span className="h-2 w-2 animate-pulse rounded-full bg-mint-deep" />Looking it up…</p>}
        {agent.status === "error" && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{/api key/i.test(agent.error?.message ?? "") ? "The assistant needs its Gemini key. Add GOOGLE_GENERATIVE_AI_API_KEY in Vercel → Settings → Environment Variables, then redeploy." : agent.error?.message || "The assistant couldn't answer. Try again."}</p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about sales, orders, leads…" className="field" aria-label="Message" />
        <button className="btn btn-ink shrink-0" disabled={!draft.trim() || agent.status === "resuming"} aria-label="Send"><Icon name="arrow" size={18} /></button>
      </form>
    </div>
  );
}
