import { ImageResponse } from "next/og";

// Static Open Graph / social share image (1200×630). Rendered with brand tokens
// only — navy ink canvas, one brand blue, no icon libraries (BC-BRAND-01).
export const alt = "Vouch — Honest Resume Tailor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Token values mirror src/app/globals.css. ImageResponse renders via satori,
// which cannot read Tailwind utilities, so the tokens are inlined here.
const INK = "#16243d";
const BRAND = "#3257c5";
const BRAND_WASH = "#eaf0fd";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 34, fontWeight: 600 }}>Vouch</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            <span>We won&apos;t write what you</span>
            <span style={{ color: "#8fa6d6" }}>can&apos;t defend</span>
          </div>
          <div style={{ fontSize: 30, color: BRAND_WASH, maxWidth: 900 }}>
            Honest resume tailoring — every line grounded in your real experience.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
