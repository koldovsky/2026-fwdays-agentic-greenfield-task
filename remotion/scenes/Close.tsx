import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { theme } from "../theme";

// The meta-move: the harness graded itself and improved itself.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: theme.ink, justifyContent: "center", padding: 160, opacity }}>
      <div style={{ fontFamily: theme.mono, letterSpacing: 5, fontSize: 24, color: "#4fbfa6", textTransform: "uppercase" }}>
        The harness improves itself
      </div>
      <div style={{ fontFamily: theme.sans, fontWeight: 700, fontSize: 72, color: theme.paper, marginTop: 22, maxWidth: 1300, lineHeight: 1.1 }}>
        I graded my own process against the cohort rubric, found my two weakest practices, and had
        the agents fix them.
      </div>
      <div style={{ fontFamily: theme.sans, fontSize: 34, color: "#a7ada7", marginTop: 32, maxWidth: 1100 }}>
        Spec-first, maker ≠ checker, verified, committed. Engineering agents — not vibe-coding.
      </div>
    </AbsoluteFill>
  );
};
