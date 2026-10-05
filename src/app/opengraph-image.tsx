import { ImageResponse } from "next/og";
export const alt = "Solar Builders NG — solar inverters, lithium batteries and panels in Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#17201B", color: "white", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "#BDF0A6" }} />
          Solar Builders<span style={{ color: "#BDF0A6" }}>.ng</span>
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>When light goes off in Lagos, yours stays on.</div>
        <div style={{ fontSize: 30, color: "#C9D3E0" }}>Felicity · itel · Sun King · Arnergy · EcoFlow — free Lagos delivery</div>
      </div>
    ),
    size
  );
}
