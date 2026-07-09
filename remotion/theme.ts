// Shared visual tokens for the demo video — mirrors the Vouch report palette
// (verdigris accent on green-biased ink) so the video reads as one brand.
export const theme = {
  paper: "#f4f3ee",
  card: "#fbfaf6",
  ink: "#16201c",
  inkSoft: "#48524d",
  inkFaint: "#7d857f",
  accent: "#0c6e5d",
  accentInk: "#0a5a4c",
  hair: "#dcdad0",
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const fps = 30;
export const width = 1920;
export const height = 1080;

// Scene lengths in frames (@30fps). Demo is dynamic — see Main.tsx.
export const dur = {
  title: 4 * fps,
  practices: 32 * fps,
  close: 8 * fps,
  demoFallback: 30 * fps, // used only if public/demo.mp4 is absent at render time
} as const;
