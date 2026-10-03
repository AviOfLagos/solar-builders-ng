import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { STORE } from "@/config/store";
import { naira, firstName } from "@/lib/format";
import { db } from "@/lib/server/db";
import { loadPool } from "@/lib/server/pools";

const INK = "#10213B", SUN = "#FFC21A", MIST = "#C9D3E0";

// Bricolage Grotesque, split by Fontsource into "latin" and "latin-ext" (which has the ₦ sign).
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 800; style: "normal" }[]> | null = null;
const loadFonts = () => (fonts ??= Promise.all(
  (["latin-500", "latin-ext-500", "latin-800", "latin-ext-800"] as const).map(async (f) => ({
    name: f.includes("ext") ? "BricolageExt" : "Bricolage", data: await readFile(join(process.cwd(), `assets/fonts/bricolage-grotesque-${f}-normal.woff`)), weight: (f.endsWith("800") ? 800 : 500) as 500 | 800, style: "normal" as const,
  })),
).catch((e) => { fonts = null; throw e; }));

/**
 * Share pictures, made from live data so they're always current (Duolingo-style milestones).
 * /api/v1/share/pool/{id} and /api/v1/share/order/{ref}; ?f=story (1080×1920) or ?f=square.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/share/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const story = new URL(req.url).searchParams.get("f") !== "square";
  const size = story ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };
  const host = new URL(STORE.url).host;
  try {
    const c = kind === "pool" ? await poolCard(id, host) : kind === "order" ? await orderCard(id, host) : null;
    if (!c) return new Response("Not found", { status: 404 });
    const qr = await QRCode.toDataURL(c.url, { margin: 1, width: 260, color: { dark: INK, light: "#FFFFFF" } });
    return new ImageResponse(<Card {...c} qr={qr} story={story} />, { ...size, fonts: await loadFonts(), headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
  } catch (e) {
    console.error("[share image]", e);
    return new Response("Could not make the picture", { status: 500 });
  }
}

type C = { eyebrow: string; headline: string; sub: string; pct?: number; url: string; label: string };

async function poolCard(pid: string, host: string): Promise<C | null> {
  const p = await loadPool(pid);
  if (!p || p.status === "cancelled") return null;
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from contributions where pool_id = ${pid} and status = 'paid' and amount > 0`;
  const [o] = p.status === "funded" ? await sql`select status from orders where pool_id = ${pid} order by created_at desc limit 1` : [];
  const [u] = await sql`select name from users where id = ${p.user_id}`;
  const who = p.delivery.name ? firstName(p.delivery.name) : firstName(u?.name);
  const pct = Math.min(100, Math.floor((p.raised / p.goal) * 100));
  const url = `${STORE.url}/fund/${pid}`;
  const people = `${n} ${n === 1 ? "person" : "people"}`;
  if (o && (o.status === "delivered" || o.status === "installed"))
    return { eyebrow: "GO SOLAR ME · LIGHTS ON", headline: `Lights on for ${who}!`, sub: `Thank you to the ${people} who made it happen.`, pct: 100, url, label: `${host}/fund/${pid}` };
  if (p.status === "funded")
    return { eyebrow: "GO SOLAR ME · FUNDED", headline: p.title, sub: `Funded by ${people}. Delivery is next.`, pct: 100, url, label: `${host}/fund/${pid}` };
  if (p.kind === "squad") {
    const [{ open: left, total }] = await sql`select count(*) filter (where status = 'open')::int as open, count(*)::int as total from shares where pool_id = ${pid}`;
    return { eyebrow: `SQUAD SPLIT · ${total - left} OF ${total} PAID`, headline: p.title, sub: `${total} people, about ${naira(Math.floor(p.goal / total))} each. Tap your name to pay your share.`, pct, url, label: `${host}/fund/${pid}` };
  }
  if (p.raised === 0)
    return { eyebrow: "GO SOLAR ME", headline: p.title, sub: `Chip in any amount. Every naira goes to the solar kit. Goal: ${naira(p.goal)}.`, url, label: `${host}/fund/${pid}` };
  return { eyebrow: `GO SOLAR ME · ${pct}% THERE`, headline: p.title, sub: `${naira(p.raised)} of ${naira(p.goal)} from ${people}. ${naira(p.goal - p.raised)} to go.`, pct, url, label: `${host}/fund/${pid}` };
}

async function orderCard(ref: string, host: string): Promise<C | null> {
  if (!/^SB-[A-Z0-9]{6}$/.test(ref)) return null;
  const sql = await db();
  const [o] = await sql`select buyer, recipient, delivery, items, status from orders where id = ${ref} and status not in ('awaiting_payment', 'expired', 'cancelled', 'refunded')`;
  if (!o) return null;
  const who = firstName(o.recipient?.name || o.buyer.name);
  const kit = (o.items as { name: string }[]).slice(0, 2).map((i) => i.name.split(/[,(]/)[0].trim()).join(" + ");
  const on = o.status === "delivered" || o.status === "installed";
  return {
    eyebrow: on ? "LIGHTS ON" : "GOING SOLAR",
    headline: on ? `Lights on at ${who}'s place` : `${who} is going solar`,
    sub: `${kit} · ${o.delivery.lga}, Lagos. No more fuel, no more noise.`,
    url: STORE.url, label: `Size yours in 4 taps · ${host}`,
  };
}

function Card({ eyebrow, headline, sub, pct, label, qr, story }: C & { qr: string; story: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, color: "white", padding: story ? "120px 88px" : "80px 80px", fontFamily: "Bricolage, BricolageExt", fontWeight: 500 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800 }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: SUN }} />
        <div style={{ display: "flex" }}>Solar Builders<span style={{ color: SUN }}>.ng</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 48 : 32 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 4, color: SUN }}>{eyebrow}</div>
        <div style={{ fontSize: story ? 104 : 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>{headline}</div>
        {pct !== undefined && (
          <div style={{ display: "flex", width: "100%", height: 36, borderRadius: 999, background: "rgba(255,255,255,0.15)" }}>
            <div style={{ display: "flex", width: `${Math.max(pct, 3)}%`, height: "100%", borderRadius: 999, background: SUN }} />
          </div>
        )}
        <div style={{ fontSize: story ? 46 : 38, lineHeight: 1.3, color: MIST }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 34, color: MIST, maxWidth: 640 }}>
          <span style={{ color: "white", fontWeight: 800 }}>Scan or visit</span>
          <span>{label}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={qr} width={story ? 240 : 200} height={story ? 240 : 200} style={{ borderRadius: 16 }} alt="" />
      </div>
    </div>
  );
}
