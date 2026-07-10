// Public API for shared/lib/evals — agent-engineering evals (pure).
// OUTPUT evals grade the final tailoring artifact; TRAJECTORY evals grade the run.
export { gradeOutput } from "./output";
export { gradeTrajectory, MAX_ATTEMPTS } from "./trajectory";
export { runSuite, type SuiteResult, type CaseResult } from "./runner";
export type {
  Check,
  Grade,
  TailoringOutput,
  ChecklistLine,
  OutputCase,
  RunTrace,
  TraceStep,
  SkillName,
  TrajectoryCase,
} from "./types";
