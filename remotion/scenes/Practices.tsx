import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";

import { theme } from "../theme";

// The part the course grades: AI tooling + agentic-engineering practices, one
// slide per practice. Each cites the concrete committed artifact (not a virtue).
const SLIDES: { tag: string; head: string; body: string; artifact: string }[] = [
  {
    tag: "Context engineering",
    head: "Layered rules + a live handoff",
    body: "AGENTS.md / CLAUDE.md static rules plus docs/current-state.md — the persistent plan between sessions, injected every turn by a hook.",
    artifact: "AGENTS.md · docs/current-state.md · .claude/hooks/",
  },
  {
    tag: "Spec-driven development",
    head: "Spec before code",
    body: "Every capability is an OpenSpec change with WHEN/THEN scenarios citing PRD requirement IDs. 25 change-packs, 7 baseline specs.",
    artifact: "openspec/changes/**/proposal.md",
  },
  {
    tag: "Maker ≠ checker",
    head: "The writer never reviews itself",
    body: "A fresh-context checker + verifier subagent audit every diff, and each review is a committed review-findings.json — enforced in CI.",
    artifact: ".claude/agents/checker.md · review-findings.json",
  },
  {
    tag: "Verification",
    head: "Honesty is machine-checked",
    body: "1300 tests + live evals that push an adversarial fabricated letter through the real pipeline and assert it is rejected. All gated in CI.",
    artifact: "src/views/evals/honesty-live.eval.test.ts · .github/workflows/ci.yml",
  },
];

const Slide: React.FC<(typeof SLIDES)[number]> = ({ tag, head, body, artifact }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, justifyContent: "center", padding: 160, opacity }}>
      <div style={{ fontFamily: theme.mono, letterSpacing: 5, fontSize: 24, color: theme.accent, textTransform: "uppercase" }}>
        {tag}
      </div>
      <div style={{ fontFamily: theme.sans, fontWeight: 700, fontSize: 76, color: theme.ink, marginTop: 22, maxWidth: 1300 }}>
        {head}
      </div>
      <div style={{ fontFamily: theme.sans, fontSize: 36, color: theme.inkSoft, marginTop: 28, maxWidth: 1200, lineHeight: 1.45 }}>
        {body}
      </div>
      <div style={{ fontFamily: theme.mono, fontSize: 24, color: theme.inkFaint, marginTop: 40, borderLeft: `3px solid ${theme.accent}`, paddingLeft: 20 }}>
        {artifact}
      </div>
    </AbsoluteFill>
  );
};

export const Practices: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const per = Math.floor(totalFrames / SLIDES.length);
  return (
    <AbsoluteFill>
      {SLIDES.map((s, i) => (
        <Sequence key={s.tag} from={i * per} durationInFrames={per}>
          <Slide {...s} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
