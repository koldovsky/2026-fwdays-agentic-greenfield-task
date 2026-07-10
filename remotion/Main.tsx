import { Series } from "remotion";

import { Close } from "./scenes/Close";
import { Demo } from "./scenes/Demo";
import { Practices } from "./scenes/Practices";
import { Title } from "./scenes/Title";
import { dur } from "./theme";

// The full timeline: idea → captured product demo → practices → close.
// The demo length is resolved from public/demo.mp4 in Root.tsx's calculateMetadata.
export const Main = ({
  demoDurationInFrames,
  hasClip,
}: {
  demoDurationInFrames: number;
  hasClip: boolean;
}) => (
  <Series>
    <Series.Sequence durationInFrames={dur.title}>
      <Title />
    </Series.Sequence>
    <Series.Sequence durationInFrames={demoDurationInFrames}>
      <Demo hasClip={hasClip} />
    </Series.Sequence>
    <Series.Sequence durationInFrames={dur.practices}>
      <Practices totalFrames={dur.practices} />
    </Series.Sequence>
    <Series.Sequence durationInFrames={dur.close}>
      <Close />
    </Series.Sequence>
  </Series>
);
