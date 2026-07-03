// Client-side reader for POST /api/tailor/analyze (FR-WIZARD-01) — the wizard's
// analysis phase. Streams the same NDJSON shape as /api/tailor but ends in an
// `analysis` event (checklist + score + clarifying questions), never `result`.
// A non-ok response degrades to a single calm `failed` event (NFR-OBS-01).
import type { AnalysisEvent } from "../lib/loop";
import type { TailoringRunInput } from "../model/types";
import { readNdjson } from "./read-ndjson";

export function streamAnalyze(
  input: TailoringRunInput,
): AsyncGenerator<AnalysisEvent, void, void> {
  return readNdjson<AnalysisEvent>("/api/tailor/analyze", input, {
    type: "error",
    code: "failed",
  });
}
