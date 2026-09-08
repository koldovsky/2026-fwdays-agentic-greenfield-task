export type SelectedEmailPhase = "land" | "select" | "open" | "type" | "extract" | "hold";

export const SELECTED_EMAIL_STEPS = [
  { phase: "land", duration: 500 },
  { phase: "select", duration: 620 },
  { phase: "open", duration: 680 },
  { phase: "type", duration: 1250 },
  { phase: "extract", duration: 700 },
  { phase: "hold", duration: 1200 },
  { phase: "swap", duration: 320 },
] as const;

export const SELECTED_EMAIL_TOTAL = SELECTED_EMAIL_STEPS.reduce(
  (total, step) => total + step.duration,
  0,
);

export function getPhaseOffset(phase: SelectedEmailPhase): number {
  let offset = 0;
  for (const step of SELECTED_EMAIL_STEPS) {
    if (step.phase === phase) return offset;
    offset += step.duration;
  }
  return offset;
}

export function getPhaseDuration(phase: SelectedEmailPhase): number {
  return SELECTED_EMAIL_STEPS.find((step) => step.phase === phase)?.duration ?? 0;
}

export function getPhaseAt(elapsed: number): SelectedEmailPhase {
  let offset = 0;
  for (const step of SELECTED_EMAIL_STEPS) {
    offset += step.duration;
    if (step.phase !== "swap" && elapsed < offset) return step.phase;
  }
  return "hold";
}
