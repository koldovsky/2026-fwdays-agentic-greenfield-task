// Public API for the run-tailoring feature — the skills-based tailoring agent
// loop (add-agent-loop). Other layers (the /api/tailor route, the workspace
// view) import ONLY this barrel, never the internal lib/ or model/ files (FSD
// slice public-API rule, docs/system-design.md §5.4).
export {
  runAnalysisPhase,
  runGenerationPhase,
  runTailoringLoop,
  STEP_CAP,
  type AnalysisEvent,
  type AnalysisResult,
  type GenerationEvent,
  type GenerationPhaseInput,
  type LoopDeps,
} from "./lib/loop";
export type {
  TailorErrorCode,
  TailorRunEvent,
  TailorRunPhase,
  TailoringRunInput,
  TailoringRunResult,
} from "./model/types";
export { TailoringForm, type TailoringFormProps } from "./ui/TailoringForm";
export { AnalyzeForm, type AnalyzeFormProps } from "./ui/AnalyzeForm";
// Wizard-phase stream clients (the view orchestrates analyze → generate).
export { streamAnalyze } from "./api/stream-analyze";
export { streamGenerate } from "./api/stream-generate";
// Server-side history persistence (add-tailoring-history) — invoked by the
// generate route after a paid user's terminal `result` event.
export {
  persistTailoring,
  type PersistTailoringDeps,
  type PersistTailoringArgs,
} from "./api/persist-tailoring";
