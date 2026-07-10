import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

import { theme } from "../theme";

// Embeds the Playwright-captured product walkthrough (public/demo.mp4).
// The clip already carries its own on-screen caption overlay (see e2e/demo.spec.ts),
// so this scene just frames it. `src` falls back to a placeholder card handled by
// Main.tsx when the file is missing (pre-capture).
export const Demo: React.FC<{ hasClip: boolean }> = ({ hasClip }) => {
  if (!hasClip) {
    return (
      <AbsoluteFill style={{ backgroundColor: theme.ink, justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: theme.mono, fontSize: 30, color: theme.paper, textAlign: "center", maxWidth: 1200 }}>
          demo.mp4 not captured yet — run `yarn demo:capture` then `yarn demo:convert`.
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: theme.ink }}>
      <OffthreadVideo src={staticFile("demo.mp4")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </AbsoluteFill>
  );
};
