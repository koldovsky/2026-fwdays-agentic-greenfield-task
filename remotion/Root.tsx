import { getVideoMetadata } from "@remotion/media-utils";
import { Composition, staticFile } from "remotion";

import { Main } from "./Main";
import { dur, fps, height, width } from "./theme";

// Single composition "Main". calculateMetadata probes public/demo.mp4 so the
// timeline auto-fits the captured clip; if the clip is absent (pre-capture) it
// falls back to a placeholder scene + a fixed length so the studio still opens.
export const RemotionRoot = () => (
  <Composition
    id="Main"
    component={Main}
    fps={fps}
    width={width}
    height={height}
    durationInFrames={dur.title + dur.demoFallback + dur.practices + dur.close}
    defaultProps={{ demoDurationInFrames: dur.demoFallback, hasClip: false }}
    calculateMetadata={async () => {
      let demoFrames = dur.demoFallback;
      let hasClip = false;
      try {
        const meta = await getVideoMetadata(staticFile("demo.mp4"));
        demoFrames = Math.max(1, Math.round(meta.durationInSeconds * fps));
        hasClip = true;
      } catch {
        // public/demo.mp4 not captured yet — keep the fallback length + placeholder.
      }
      return {
        durationInFrames: dur.title + demoFrames + dur.practices + dur.close,
        props: { demoDurationInFrames: demoFrames, hasClip },
      };
    }}
  />
);
