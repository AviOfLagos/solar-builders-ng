import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/server/social";
import { ItemsList } from "@/components/ItemsList";
import { Share } from "@/components/Share";
import { Contribute } from "./Contribute";
import { naira } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/fund/[id]">): Promise<Metadata> {
  const p = await getPool((await props.params).id);
  if (!p) return { title: "Funding page not found" };
  return { title: `${p.title} — help ${p.owner} go solar`, description: `${naira(p.raised)} of ${naira(p.goal)} raised. Chip in any amount to help ${p.owner} get solar in Lagos.` };
}

export default async function FundPage(props: PageProps<"/fund/[id]">) {
  const p = await getPool((await props.params).id);
  if (!p) notFound();
  const pct = Math.min(100, Math.round((p.raised / p.goal) * 100));
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_400px]">
      <div>
        {p.occasion && <p className="text-sm font-semibold text-sun-deep">{p.occasion}</p>}
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{p.title}</h1>
        <p className="mt-2 text-mute">Started by {p.owner}{p.lga ? ` · ${p.lga}, Lagos` : ""}</p>
        {p.story && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-2">{p.story}</p>}
        <h2 className="font-display mt-10 text-xl font-semibold">What this pays for</h2>
        <div className="mt-3"><ItemsList items={p.items} /></div>
        <p className="mt-3 text-sm text-mute">When the goal is reached, Solar Builders NG orders everything from the brands and delivers it in Lagos. Money goes to us, not to the page owner.</p>
        {p.supporters.length > 0 && (
          <>
            <h2 className="font-display mt-10 text-xl font-semibold">{p.supporters.length} {p.supporters.length === 1 ? "person has" : "people have"} chipped in</h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">
              {p.supporters.map((s, i) => (
                <li key={i} className="flex justify-between gap-4 p-4 text-sm"><span><b>{s.name}</b>{s.message && <span className="block text-ink-2">“{s.message}”</span>}</span><span className="num shrink-0 font-semibold">{naira(s.amount)}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
      <aside className="h-fit space-y-5 rounded-2xl border border-line bg-paper p-5 lg:sticky lg:top-24">
        <div>
          <p className="font-display num text-3xl font-bold">{naira(p.raised)}</p>
          <p className="text-sm text-mute">raised of {naira(p.goal)}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-haze" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-xs text-mute">{pct}% funded</p>
        </div>
        {p.status === "open" ? <Contribute poolId={p.id} remaining={p.goal - p.raised} /> : <p className="rounded-xl bg-leaf/10 p-4 text-sm font-semibold">Goal reached! The order is with Solar Builders NG.</p>}
        <Share path={`/fund/${p.id}`} text={`Help ${p.owner} go solar: ${p.title}`} />
      </aside>
    </div>
  );
}
