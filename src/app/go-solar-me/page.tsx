import type { Metadata } from "next";
import Link from "next/link";
import { db, dbConfigured } from "@/lib/server/db";
import { naira } from "@/lib/format";
import { POOL } from "@/config/store";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Go Solar Me — fund solar for someone in Lagos, together",
  description: "Start a Go Solar Me page for a solar kit. Family, friends and housemates chip in any amount or split it equally. Money only becomes solar; if the goal isn't reached, everyone is refunded.",
  alternates: { canonical: "/go-solar-me" },
};

async function openPools() {
  if (!dbConfigured()) return [];
  try {
    const sql = await db();
    return await sql`select p.id, p.title, p.goal, p.raised, split_part(u.name, ' ', 1) as owner from pools p join users u on u.id = p.user_id
      where p.status = 'open' and p.kind = 'public' and p.raised > 0 order by p.created_at desc limit 6`;
  } catch { return []; }
}

const STEPS = [
  ["Pick the kit", "Use the calculator or a package. The goal is the kit's price, nothing more."],
  ["Share your page", "One tap to WhatsApp. We make the pictures for your status as it fills up."],
  ["We deliver at 100%", "The order places itself. We deliver and install in Lagos."],
];

const RULES = [
  "Money goes to Solar Builders NG, never to the page owner, and only ever becomes solar.",
  "If the goal isn't reached by the deadline, the owner can extend once, switch to a smaller kit, or close the page.",
  `If they do nothing within ${POOL.choiceDays} days, everyone is refunded to their card automatically.`,
  "If a payment lands after the kit is funded, the extra goes straight back to that card.",
  "If the last bit left is under ₦1,000, we cover it so the kit isn't stuck.",
];

export default async function GoSolarMe() {
  const pools = await openPools();
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <p className="font-semibold text-sun">Go Solar Me</p>
          <h1 className="font-display mt-2 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Light for someone you love, funded together.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Mum&apos;s birthday, your shared flat, your church. Start a page for a solar kit and let people chip in, or split it equally with your squad.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/find" className="btn btn-sun">Find my kit</Link>
            <Link href="/fund/new" className="btn btn-ghost !border-white/30 !bg-transparent !text-white">I already have a kit in my cart</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pt-12">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sun font-bold">{i + 1}</span>
              <h2 className="font-display mt-3 text-xl font-semibold">{t}</h2>
              <p className="mt-1 text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pt-10 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold">Anyone chips in</h2>
          <p className="mt-2 text-ink-2">Any amount from ₦1,000, or fund a whole part like a panel or the battery. No account needed to give.</p>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold">Split with your squad</h2>
          <p className="mt-2 text-ink-2">2 to {POOL.squadMax} housemates or siblings. Everyone gets an equal share and their own pay button. The kit orders when the last share is paid.</p>
          <Link href="/fund/new?kind=squad" className="mt-3 inline-block text-sm font-semibold underline">Start a squad split</Link>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pt-10">
        <div className="rounded-2xl bg-haze p-6">
          <h2 className="font-display text-2xl font-bold">How your money is kept safe</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          <Link href="/legal/pool-rules" className="mt-3 inline-block text-sm underline">Full Go Solar Me rules</Link>
        </div>
      </section>
      {pools.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <h2 className="font-display text-2xl font-bold">Live pages</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {pools.map((p) => {
              const pct = Math.min(100, Math.floor((p.raised / p.goal) * 100));
              return (
                <li key={p.id}>
                  <Link href={`/fund/${p.id}`} className="block rounded-xl border border-line bg-paper p-4 hover:border-ink">
                    <span className="font-semibold">{p.title}</span>
                    <span className="mt-1 block text-sm text-mute">by {p.owner} · {naira(p.raised)} of {naira(p.goal)}</span>
                    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-haze"><span className="block h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
