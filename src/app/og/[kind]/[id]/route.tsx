import { ImageResponse } from "next/og";
import { STORE } from "@/config/store";
import { naira } from "@/lib/format";
import { brandName, getBrand, getCategory, getProduct, products } from "@/lib/catalog";
import { GUIDES } from "@/data/content";
import { getSegment } from "@/data/packages";
import { PROMO } from "@/config/store";
import { loadPool } from "@/lib/server/pools";
import { getBuild, getStorePage } from "@/lib/server/social";
import { OG_SIZE, OgCard, loadFonts, publicImage, type OgData } from "@/lib/og";

const HOST = () => new URL(STORE.url).host;
const BIG = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Fixed copy for fixed pages. Kept here (not in the URL) so nobody can print their own words on our card. */
const PAGES: Record<string, Omit<OgData, "host">> = {
  home: { eyebrow: "Lagos · free delivery", title: "When light goes off in Lagos, yours stays on.", sub: "Felicity, itel, Sun King, Arnergy and EcoFlow, delivered and installed." },
  shop: { eyebrow: "Shop", title: "Inverters, batteries, panels and power stations", sub: "Genuine brands. Free Lagos delivery." },
  deals: { eyebrow: "Solar Friday", title: `${PROMO.percent}% off every Friday`, sub: "Selected batteries, inverters, panels and power stations." },
  brands: { eyebrow: "Brands", title: "Solar brands we stock in Lagos", sub: "Bought from each brand's official Nigerian store." },
  packages: { eyebrow: "Packages", title: "Solar for every Lagos home, shop and office", sub: "Ready-made kits with installed cost shown upfront." },
  guides: { eyebrow: "Guides", title: "Plain-English solar buying guides", sub: "Short, practical answers before you spend." },
  "go-solar-me": { eyebrow: "Go Solar Me", title: "Fund solar for someone you love, together", sub: "Friends chip in any amount. If the goal isn't reached, everyone is refunded." },
  find: { eyebrow: "Find my kit", title: "Size your solar in 4 taps", sub: "Tell us what you power. We match a kit and show what you save on fuel." },
  start: { eyebrow: "Start here", title: "Going solar, made simple", sub: "Pick your path: for you, for family, with friends, or as an installer." },
  kit: { eyebrow: "Your kit", title: "Pay your way", sub: "Pay in full, split it with friends, or pay small small." },
  "pay-small-small": { eyebrow: "Pay small small", title: "Get solar now. Pay over 3 to 12 months.", sub: "Pick your kit, choose a down payment, apply in minutes." },
  sell: { eyebrow: "Sell and earn", title: "Open a free solar store and earn on every sale", sub: "We handle stock, payment and delivery across Lagos." },
  faq: { eyebrow: "Help", title: "Questions and answers", sub: "Delivery, installation, payments and warranty." },
  "gift-cards": { eyebrow: "Gift cards", title: "Give light in Lagos", sub: "Solar gift cards from ₦10,000 for birthdays, weddings and staff." },
  give: { eyebrow: "Buy for them", title: "Buy solar for family in Lagos, from anywhere", sub: "We deliver, install and keep you posted." },
  open: { eyebrow: "Open a link", title: "Got a link or code?", sub: "Open a priced list from your installer or a friend's page." },
};

async function data(kind: string, id: string): Promise<OgData | null> {
  const host = HOST();
  switch (kind) {
    case "page": return PAGES[id] ? { ...PAGES[id], host } : null;
    case "product": {
      const p = getProduct(id); if (!p) return null;
      return { eyebrow: brandName(p.brand), title: BIG(p.name, 90), sub: p.specs?.slice(0, 4).join(" · ") || undefined, image: await publicImage(p.image), price: naira(p.price), host };
    }
    case "brand": {
      const b = getBrand(id); if (!b) return null;
      const n = products.filter((p) => p.brand === b.slug);
      const img = n[0] ? await publicImage(n[0].image) : null;
      return { eyebrow: "Brand", title: b.name, sub: `${b.tagline} ${n.length} products from ${naira(Math.min(...n.map((p) => p.price)))}.`, image: img, host };
    }
    case "category": {
      const c = getCategory(id); if (!c) return null;
      const n = products.filter((p) => p.category === c.slug).sort((a, b) => a.price - b.price);
      return { eyebrow: "Category", title: c.name, sub: `${n.length} options from ${naira(n[0]?.price ?? 0)}. Free delivery in Lagos.`, image: n[0] ? await publicImage(n[0].image) : null, host };
    }
    case "package": {
      const s = getSegment(id); if (!s) return null;
      return { eyebrow: "Solar package", title: `Solar for ${s.name.toLowerCase()}`, sub: BIG(s.who, 130), host };
    }
    case "guide": {
      const g = GUIDES.find((x) => x.slug === id); if (!g) return null;
      return { eyebrow: "Guide", title: BIG(g.title, 90), sub: BIG(g.description, 130), host };
    }
    case "fund": {
      const p = await loadPool(id); if (!p || p.status === "cancelled") return null;
      const pct = Math.min(100, Math.floor((p.raised / p.goal) * 100));
      const done = p.status === "funded";
      return { eyebrow: done ? "Go Solar Me · Funded" : `Go Solar Me · ${pct}% there`, title: BIG(p.title, 80), sub: done ? "Fully funded. Delivery is next." : `${naira(p.raised)} of ${naira(p.goal)} raised. Chip in any amount.`, pct, host: `${host}/fund/${id}` };
    }
    case "store": {
      const s = await getStorePage(id); if (!s) return null;
      return { eyebrow: s.kind === "installer" ? "Solar installer" : "Solar store", title: BIG(s.name, 60), sub: BIG(s.bio || "Genuine solar, delivered free across Lagos.", 130), host: `${host}/s/${id}` };
    }
    case "build": {
      const b = await getBuild(id); if (!b) return null;
      const by = b.store ? b.store.name : "Solar Builders NG";
      return { eyebrow: "Priced list", title: BIG(b.title || "A solar setup", 70), sub: `By ${by} · ${b.items.length} items · ${naira(b.total)}. Delivered in Lagos.`, price: naira(b.total), host };
    }
    default: return null;
  }
}

/** Link-preview pictures (1200×630) for every page: /og/page/home, /og/product/{slug}, /og/fund/{id} and so on. */
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  try {
    const d = (await data(kind, id)) ?? (await data("page", "home"))!;
    const dynamic = ["fund", "store", "build"].includes(kind);
    return new ImageResponse(<OgCard {...d} />, { ...OG_SIZE, fonts: await loadFonts(), headers: { "cache-control": dynamic ? "public, max-age=300, s-maxage=300" : "public, max-age=86400, s-maxage=86400" } });
  } catch (e) {
    console.error("[og]", e);
    return new Response("Could not make the picture", { status: 500 });
  }
}
