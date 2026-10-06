import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/api";
import { poolPage } from "@/lib/server/pools";
import { ItemsList } from "@/components/ItemsList";
import { Share } from "@/components/Share";
import { Contribute } from "./Contribute";
import { OwnerPanel } from "./OwnerPanel";
import { ChipInBar, FundView } from "./FundView";
import { naira } from "@/lib/format";
import { OCCASIONS, ORDER_STATUS, type OrderStatus } from "@/config/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/fund/[id]">): Promise<Metadata> {
  const p = await poolPage((await props.params).id, null);
  if (!p) return { title: "Go Solar Me page not found" };
  return withOg({
    title: `${p.title} · Go Solar Me`,
    description: `${naira(p.raised)} of ${naira(p.goal)} raised. Chip in any amount to help ${p.owner} go solar in Lagos.`,
    robots: { index: false },
  }, `fund/${p.id}`);
}

function daysLeft(d: Date) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  return days <= 0 ? "Deadline passed" : days === 1 ? "Last day" : `${days} days left`;
}

export default async function FundPage(props: PageProps<"/fund/[id]">) {
  const p = await poolPage((await props.params).id, await currentUser());
  if (!p) notFound();
  const pct = Math.min(100, Math.floor((p.raised / p.goal) * 100));
  const open = p.status === "open" || p.status === "ended";
  const occasion = OCCASIONS.find((o) => o.slug === p.occasion)?.label;
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-28 pt-10 sm:py-12 lg:pb-12 lg:grid-cols-[1fr_400px]">
      <FundView live={open} count={p.supporters.length}
        about={<>
        <p className="text-sm font-semibold text-sun-deep">{p.kind === "squad" ? "Squad split" : "Go Solar Me"}{occasion ? ` · ${occasion}` : ""}</p>
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{p.title}</h1>
        <p className="mt-2 text-mute">Started by {p.owner}{p.lga ? ` · ${p.lga}, Lagos` : ""}{open ? ` · ${daysLeft(p.deadline)}` : ""}</p>
        {p.story && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-2">{p.story}</p>}
        <h2 className="font-display mt-10 text-xl font-semibold">What this pays for</h2>
        <div className="mt-3"><ItemsList items={p.items} /></div>
        <p className="mt-3 text-sm text-mute">Money goes to Solar Builders NG, never to the page owner. When the goal is reached we order the kit and deliver it in Lagos. If it isn&apos;t reached, the owner can extend, switch to a smaller kit, or close the page and everyone is refunded to their card.</p>
        </>}
        supporters={        <>
          <h2 className="font-display text-xl font-semibold lg:mt-10">{p.supporters.length ? `${p.supporters.length} ${p.supporters.length === 1 ? "person has" : "people have"} chipped in` : "Supporters"}</h2>
          {p.leaders.length > 0 && (
            <ol className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Top supporters">
              {p.leaders.slice(0, 3).map((l, i) => (
                <li key={l.name} className={`rounded-2xl p-4 ${i === 0 ? "bg-night text-white" : "bg-haze"}`}>
                  <p className={`text-xs font-bold ${i === 0 ? "text-mint" : "text-mute"}`}>#{i + 1} supporter</p>
                  <p className="mt-1 truncate font-semibold">{l.name}</p>
                  <p className="num text-lg">{naira(l.total)}</p>
                </li>
              ))}
            </ol>
          )}
          {p.supporters.length === 0 ? <p className="mt-3 rounded-xl bg-haze p-4 text-sm text-ink-2">Be the first to chip in.</p> : (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">
              {p.supporters.map((s, i) => (
                <li key={i} className="flex justify-between gap-4 p-4 text-sm">
                  <span className="min-w-0"><b>{s.name}</b>{s.piece && <span className="text-mute"> · funded {s.piece}</span>}{s.message && <span className="block break-words text-ink-2">“{s.message}”</span>}</span>
                  <span className="num shrink-0 font-semibold">{naira(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>} />
      <aside id="chip-in" className="h-fit scroll-mt-24 min-w-0 space-y-5 card p-5 lg:sticky lg:top-24">
        <div>
          <p className="font-display num text-3xl font-bold">{naira(p.raised)}</p>
          <p className="text-sm text-mute">raised of {naira(p.goal)}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-haze" role="progressbar" aria-label="Funded" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-xs text-mute">{pct}% funded{open && p.raised < p.goal ? ` · ${naira(p.goal - p.raised)} to go` : ""}</p>
        </div>
        {p.status === "ended" && <p className="rounded-xl bg-mint-tint p-3 text-sm">The deadline has passed. You can still chip in while {p.owner} decides what&apos;s next.</p>}
        {open ? (
          <Contribute pool={{ id: p.id, kind: p.kind, remaining: p.goal - p.raised, items: p.items, shares: p.shares }} />
        ) : p.status === "funded" ? (
          <p className="rounded-xl bg-leaf/10 p-4 text-sm"><b>Goal reached!</b> {p.order ? `Order status: ${ORDER_STATUS[p.order.status as OrderStatus] ?? p.order.status}.` : "The order is with Solar Builders NG."}</p>
        ) : <p className="rounded-xl bg-haze p-4 text-sm">This page is closed. Everyone who chipped in was refunded to their card.</p>}
        {p.status !== "cancelled" && <Share path={`/fund/${p.id}`} text={p.status === "funded" ? `${p.title}: funded!` : `Help ${p.owner}: ${p.title}`} images={[{ label: "Story", href: `/api/v1/share/pool/${p.id}?f=story` }, { label: "Square", href: `/api/v1/share/pool/${p.id}?f=square` }]} />}
        {p.isOwner && <OwnerPanel pool={{ id: p.id, status: p.status, kind: p.kind, raised: p.raised, extended: p.extended, needsAddress: p.needsAddress, choiceEnds: p.choiceEnds ? new Date(p.choiceEnds).toISOString() : null }} />}
      </aside>
      {open && <ChipInBar />}
    </div>
  );
}
