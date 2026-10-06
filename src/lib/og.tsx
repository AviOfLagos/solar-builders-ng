import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
const MINT = "#bdf0a6", HAZE = "#f3f2ec", NIGHT = "#1d2621";

// Manrope for text. Manrope has no ₦ sign, so Inter (latin-ext) fills in for it.
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 800; style: "normal" }[]> | null = null;
export const loadFonts = () => (fonts ??= Promise.all(
  (["latin-500", "latin-ext-500", "latin-800", "latin-ext-800"] as const).map(async (f) => ({
    name: f.includes("ext") ? "Naira" : "Manrope", data: await readFile(join(process.cwd(), `assets/fonts/${f.includes("ext") ? "inter-" : "manrope-"}${f}-normal.woff`)), weight: (f.endsWith("800") ? 800 : 500) as 500 | 800, style: "normal" as const,
  })),
).catch((e) => { fonts = null; throw e; }));

/** A public/ image as a PNG data URL (Satori reads PNG and JPEG, not WebP). */
export async function publicImage(path: string): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(await readFile(join(process.cwd(), "public", path.replace(/^\//, "")))).resize({ width: 520, height: 520, fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch { return null; }
}

export type OgData = { eyebrow: string; title: string; sub?: string; image?: string | null; price?: string; pct?: number; host: string };

const Sun = ({ size = 280 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="6.5" fill={MINT} />
    <g fill={MINT}>
      <rect x="15" y="3" width="2" height="4" rx="1" /><rect x="15" y="25" width="2" height="4" rx="1" />
      <rect x="3" y="15" width="4" height="2" rx="1" /><rect x="25" y="15" width="4" height="2" rx="1" />
      <rect x="6.5" y="6.5" width="2" height="4" rx="1" transform="rotate(-45 7.5 8.5)" /><rect x="23.5" y="21.5" width="2" height="4" rx="1" transform="rotate(-45 24.5 23.5)" />
      <rect x="23.5" y="6.5" width="2" height="4" rx="1" transform="rotate(45 24.5 8.5)" /><rect x="6.5" y="21.5" width="2" height="4" rx="1" transform="rotate(45 7.5 23.5)" />
    </g>
    <rect x="12" y="13.5" width="8" height="5" rx="1" fill={NIGHT} />
  </svg>
);

/** The calm Solar Builders link-preview card: haze page, night card, mint pill. */
export function OgCard({ eyebrow, title, sub, image, price, pct, host }: OgData) {
  const size = title.length > 70 ? 46 : title.length > 44 ? 56 : 66;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: HAZE, padding: 34, fontFamily: "Manrope, Naira" }}>
      <div style={{ flex: 1, display: "flex", background: NIGHT, borderRadius: 44, padding: "48px 56px", color: "#fff" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800 }}>
            <Sun size={44} /> <div style={{ display: "flex" }}>Solar Builders<span style={{ color: MINT }}>.ng</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignSelf: "flex-start", background: MINT, color: "#17201b", fontSize: 21, fontWeight: 800, letterSpacing: 1.5, padding: "8px 18px", borderRadius: 999 }}>{eyebrow.toUpperCase()}</div>
            <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5 }}>{title}</div>
            {sub ? <div style={{ display: "flex", fontSize: 27, lineHeight: 1.35, color: "#c4cfc8", fontWeight: 500 }}>{sub}</div> : null}
            {pct !== undefined ? (
              <div style={{ display: "flex", width: "88%", height: 18, borderRadius: 999, background: "#33403a" }}>
                <div style={{ display: "flex", width: `${Math.max(4, pct)}%`, height: 18, borderRadius: 999, background: MINT }} />
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MINT, fontWeight: 800 }}>{host}</div>
        </div>
        {image || price ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, marginLeft: 36 }}>
            {image ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 360, height: 360, borderRadius: 36, background: "#fff" }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                <img src={image} width={310} height={310} style={{ objectFit: "contain" }} />
              </div>
            ) : null}
            {price ? <div style={{ display: "flex", background: MINT, color: "#17201b", fontSize: 36, fontWeight: 800, padding: "10px 26px", borderRadius: 999 }}>{price}</div> : null}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 330, opacity: 0.9 }}><Sun size={300} /></div>
        )}
      </div>
    </div>
  );
}
