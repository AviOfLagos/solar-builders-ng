import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { STORE } from "@/config/store";
import { daysLeft, naira, firstName } from "@/lib/format";
import { db } from "@/lib/server/db";
import { loadPool } from "@/lib/server/pools";
import { kitImage, loadFonts } from "@/lib/og";
import { ShareCard as Card, type ShareCardData as C } from "@/lib/share-card";

const NIGHT = "#1d2621";

/**
 * Share pictures, made from live data so they're always current (Duolingo-style milestones).
 * /api/v1/share/pool/{id} and /api/v1/share/order/{ref}; ?f=story (1080×1920, WhatsApp status / IG story) or ?f=square.
 * The 1200×630 link preview for the same pages is /og/fund/{id}.
 * Pool moments: just started, 25/50/75% there, last push (75%+, "₦X to go"), funded, lights on.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/share/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const story = new URL(req.url).searchParams.get("f") !== "square";
  const size = story ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };
  const host = new URL(STORE.url).host;
  try {
    const c = kind === "pool" ? await poolCard(id, host) : kind === "order" ? await orderCard(id, host) : null;
    if (!c) return new Response("Not found", { status: 404 });
    const qr = await QRCode.toDataURL(c.url, { margin: 1, width: 260, color: { dark: NIGHT, light: "#FFFFFF" } });
    return new ImageResponse(<Card {...c} qr={qr} story={story} />, { ...size, fonts: await loadFonts(), headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
  } catch (e) {
    console.error("[share image]", e);
    return new Response("Could not make the picture", { status: 500 });
  }
}


async function poolCard(pid: string, host: string): Promise<C | null> {
  const p = await loadPool(pid);
  if (!p || p.status === "cancelled") return null;
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from contributions where pool_id = ${pid} and status = 'paid' and amount > 0`;
  const [o] = p.status === "funded" ? await sql`select status from orders where pool_id = ${pid} order by created_at desc limit 1` : [];
  const [u] = await sql`select name from users where id = ${p.user_id}`;
  const who = p.delivery.name ? firstName(p.delivery.name) : firstName(u?.name);
  const pct = Math.min(100, Math.floor((p.raised / p.goal) * 100));
  const left = p.goal - p.raised;
  const days = daysLeft(p.deadline);
  const url = `${STORE.url}/fund/${pid}`;
  const label = `${host}/fund/${pid}`;
  const image = await kitImage(p.items);
  const people = `${n} ${n === 1 ? "person" : "people"}`;
  if (o && (o.status === "delivered" || o.status === "installed"))
    return { eyebrow: "GO SOLAR ME · LIGHTS ON", headline: `Lights on for ${who}!`, sub: `Thank you to the ${people} who made it happen.`, pct: 100, url, label, image };
  if (p.status === "funded")
    return { eyebrow: "GO SOLAR ME · FUNDED", headline: p.title, sub: `Funded by ${people}. Thank you! Delivery is next.`, pct: 100, url, label, image };
  if (p.kind === "squad") {
    const [{ open: unpaid, total }] = await sql`select count(*) filter (where status = 'open')::int as open, count(*)::int as total from shares where pool_id = ${pid}`;
    return { eyebrow: `SQUAD SPLIT · ${total - unpaid} OF ${total} PAID`, headline: p.title, sub: `${total} people, about ${naira(Math.floor(p.goal / total))} each. Tap your name to pay your share. ${days}.`, pct, url, label, image };
  }
  if (p.raised === 0)
    return { eyebrow: "GO SOLAR ME · HELP ME GO SOLAR", headline: p.title, sub: `Chip in any amount. Every naira goes to the solar kit. Goal: ${naira(p.goal)} · ${days}.`, url, label, image };
  if (pct >= 75)
    return { eyebrow: `LAST PUSH · ${naira(left)} TO GO`, headline: p.title, sub: `${pct}% there, thanks to ${people}. Help finish it · ${days}.`, pct, url, label, image, tone: "sun" };
  return { eyebrow: `GO SOLAR ME · ${pct}% THERE`, headline: p.title, sub: `${naira(p.raised)} of ${naira(p.goal)} from ${people}. ${naira(left)} to go · ${days}.`, pct, url, label, image };
}

async function orderCard(ref: string, host: string): Promise<C | null> {
  if (!/^SB-[A-Z0-9]{6}$/.test(ref)) return null;
  const sql = await db();
  const [o] = await sql`select buyer, recipient, delivery, items, status from orders where id = ${ref} and status not in ('awaiting_payment', 'expired', 'cancelled', 'refunded')`;
  if (!o) return null;
  const items = o.items as { id: string; name: string; price: number }[];
  const who = firstName(o.recipient?.name || o.buyer.name);
  const kit = items.slice(0, 2).map((i) => i.name.split(/[,(]/)[0].trim()).join(" + ");
  const on = o.status === "delivered" || o.status === "installed";
  return {
    eyebrow: on ? "LIGHTS ON" : "GOING SOLAR",
    headline: on ? `Lights on at ${who}'s place` : `${who} is going solar`,
    sub: `${kit} · ${o.delivery.lga}, Lagos. No more fuel, no more noise.`,
    url: STORE.url, label: `Size yours in 4 taps · ${host}`, image: await kitImage(items),
  };
}
