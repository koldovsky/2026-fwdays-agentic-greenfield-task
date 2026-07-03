// Client-side reader for POST /api/tailor/generate (FR-WIZARD-01/04) — the
// wizard's generation phase. The body is the analysis payload echoed back
// (cvProfile/requirements/checklist/matchScore from the `analysis` event) plus
// the JD text as jobDescription and the confirmed clarifying answers. Streams
// the same NDJSON shape as /api/tailor, ending in a `result` event. A non-ok
// response degrades to a single calm `failed` event (NFR-OBS-01).
import type { GenerationEvent, GenerationPhaseInput } from "../lib/loop";
import { readNdjson } from "./read-ndjson";

export function streamGenerate(
  input: GenerationPhaseInput,
): AsyncGenerator<GenerationEvent, void, void> {
  return readNdjson<GenerationEvent>("/api/tailor/generate", input, {
    type: "error",
    code: "failed",
  });
}
