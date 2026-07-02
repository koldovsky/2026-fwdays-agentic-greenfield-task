// Public API for the run-tailoring feature — the skills-based tailoring agent
// loop (add-agent-loop). Other layers (the /api/tailor route, the workspace
// view) import ONLY this barrel, never the internal lib/ or model/ files (FSD
// slice public-API rule, docs/system-design.md §5.4).
export { runTailoringLoop, STEP_CAP, type LoopDeps } from "./lib/loop";
export type {
  TailorErrorCode,
  TailorRunEvent,
  TailorRunPhase,
  TailoringRunInput,
  TailoringRunResult,
} from "./model/types";
