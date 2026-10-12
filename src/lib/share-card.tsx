import { Sun } from "@/lib/og";

const INK = "#17201b", INK2 = "#3b4540", MINT = "#bdf0a6", DEEP = "#2f7d4f", HAZE = "#f3f2ec", NIGHT = "#1d2621";

/** What a Go Solar Me / order share picture says. `image` is a PNG data URL (see kitImage), `tone: "sun"` marks the last push. */
export type ShareCardData = { eyebrow: string; headline: string; sub: string; pct?: number; url: string; label: string; image: string | null; tone?: "mint" | "sun" };

/** The share picture itself: 1080×1920 when `story`, else 1080×1080. Rendered by Satori via ImageResponse. */
export function ShareCard({ eyebrow, headline, sub, pct, label, qr, story, image, tone = "mint" }: ShareCardData & { qr: string; story: boolean }) {
  const pad = story ? "100px 80px" : "64px 68px";
  const long = headline.length > 40;
  const head = story ? (long ? 84 : 100) : (long ? 64 : 76);
  const photo = image ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF", borderRadius: story ? 56 : 32, width: story ? "100%" : 190, height: story ? 560 : 190 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
      <img src={image} width={story ? 470 : 160} height={story ? 470 : 160} style={{ objectFit: "contain" }} alt="" />
    </div>
  ) : null;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: HAZE, color: INK, padding: pad, fontFamily: "Manrope, Naira", fontWeight: 500 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 800 }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 20, background: NIGHT, alignItems: "center", justifyContent: "center" }}><Sun size={48} /></div>
          <div style={{ display: "flex" }}>Solar Builders<span style={{ color: DEEP }}>.ng</span></div>
        </div>
        {!story ? photo : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 40 : 26 }}>
        {story ? photo : null}
        <div style={{ display: "flex", alignSelf: "flex-start", background: tone === "sun" ? NIGHT : MINT, color: tone === "sun" ? MINT : INK, borderRadius: 999, padding: "14px 28px", fontSize: story ? 30 : 26, fontWeight: 800, letterSpacing: 2 }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize: head, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{headline}</div>
        {pct !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", flex: 1, height: story ? 40 : 32, borderRadius: 999, background: "#FFFFFF" }}>
              <div style={{ display: "flex", width: `${Math.max(pct, 4)}%`, height: "100%", borderRadius: 999, background: DEEP }} />
            </div>
            <div style={{ display: "flex", fontSize: story ? 48 : 40, fontWeight: 800 }}>{pct}%</div>
          </div>
        )}
        <div style={{ display: "flex", fontSize: story ? 42 : 32, lineHeight: 1.35, color: INK2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, background: NIGHT, color: "white", borderRadius: 44, padding: story ? 40 : 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: story ? 32 : 28, color: "rgba(255,255,255,0.7)", maxWidth: 640 }}>
          <span style={{ color: MINT, fontWeight: 800, fontSize: story ? 38 : 32 }}>Scan or visit</span>
          <span>{label}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={qr} width={story ? 220 : 160} height={story ? 220 : 160} style={{ borderRadius: 20 }} alt="" />
      </div>
    </div>
  );
}
