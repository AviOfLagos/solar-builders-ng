"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { Pill } from "../ui";

type Pool = { id: string; kind: string; title: string; goal: number; raised: number; status: string; deadline: string | null; owner: string; supporters: number };

export default function Pools() {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => { api<{ pools: Pool[] }>("/admin/pools").then((r) => { setNow(Date.now()); setPools(r.pools); }).catch((e) => setErr((e as Error).message)); }, []);
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-4xl">Go Solar Me</h1><p className="text-sm text-mute">Pages people are raising money on, and squads splitting a kit.</p></div>
      {err && <p className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
      {!pools ? <p className="text-mute">Loading…</p> : !pools.length ? <p className="rounded-3xl bg-paper p-8 text-center text-mute">No pages yet.</p> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pools.map((p) => {
            const pct = Math.min(100, Math.round((p.raised / Math.max(1, p.goal)) * 100));
            const left = p.deadline ? Math.ceil((new Date(p.deadline).getTime() - now) / 864e5) : null;
            return (
              <li key={p.id}>
                <Link href={`/fund/${p.id}`} target="_blank" className="block h-full rounded-3xl bg-paper p-5 hover:shadow-[0_10px_30px_rgba(23,32,27,0.08)]">
                  <div className="flex items-start justify-between gap-3"><p className="font-semibold leading-snug">{p.title}</p><Pill status={p.status} /></div>
                  <p className="mt-1 text-sm text-mute">{p.owner} · {p.kind === "squad" ? "Squad split" : "Anyone chips in"}</p>
                  <div className="mt-4 h-2.5 rounded-full bg-haze"><div className="h-full rounded-full bg-mint-deep" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                  <div className="mt-2 flex justify-between text-sm"><span className="num font-semibold">{naira(p.raised)} <span className="font-normal text-mute">of {naira(p.goal)}</span></span><span className="num">{pct}%</span></div>
                  <p className="mt-1 text-xs text-mute">{p.supporters} supporters{left !== null && p.status === "open" ? ` · ${left > 0 ? `${left} days left` : "deadline passed"}` : ""}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
