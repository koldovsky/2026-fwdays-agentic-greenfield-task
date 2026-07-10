import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { theme } from "../theme";

// Opening card: the product thesis. Honest resume tailor — honesty is the product.
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(rise, [0, 1], [24, 0]);
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, justifyContent: "center", padding: 160 }}>
      <div style={{ opacity, transform: `translateY(${y}px)` }}>
        <div style={{ fontFamily: theme.mono, letterSpacing: 6, fontSize: 22, color: theme.accent, textTransform: "uppercase" }}>
          Vouch — Honest Resume Tailor
        </div>
        <div style={{ fontFamily: theme.sans, fontWeight: 700, fontSize: 96, color: theme.ink, lineHeight: 1.05, marginTop: 28, maxWidth: 1300 }}>
          Tailor your CV to a job — without inventing experience.
        </div>
        <div style={{ fontFamily: theme.sans, fontSize: 34, color: theme.inkSoft, marginTop: 32, maxWidth: 1100 }}>
          Every rewritten bullet is grounded in your own words, or flagged and left out.
          Ukrainian-first. Honesty is the product.
        </div>
      </div>
    </AbsoluteFill>
  );
};
