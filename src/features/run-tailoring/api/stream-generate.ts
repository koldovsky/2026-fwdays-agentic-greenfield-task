// Client-side reader for POST /api/tailor/generate (FR-WIZARD-01/04) — the
// wizard's generation phase. The body is the analysis payload echoed back
// (cvProfile/requirements/checklist/matchScore from the `analysis` event) plus
// the JD text as jobDescription and the confirmed clarifying answers. Streams
// the same NDJSON shape as /api/tailor, ending in a `result` event. A non-ok
// response degrades to a single calm `failed` event (NFR-OBS-01).
import type { DocumentAttachment } from "@/shared/lib/llm";

import type { GenerationEvent, GenerationPhaseInput } from "../lib/loop";
import { readNdjson } from "./read-ndjson";

/**
 * Stream the generation phase. A paid caller may pass the original CV PDF as
 * `attachment` (add-premium-pdf-attach, T5) — sent under a dedicated field
 * (never `attachments`) so the server re-validates it and honors it only after
 * its own paid-entitlement check; the client flag alone grants nothing
 * (NFR-SEC-04). Omitted → the normal text-only request.
 */
export function streamGenerate(
  input: GenerationPhaseInput,
  attachment?: DocumentAttachment,
): AsyncGenerator<GenerationEvent, void, void> {
  const body = attachment !== undefined ? { ...input, attachment } : input;
  return readNdjson<GenerationEvent>("/api/tailor/generate", body, {
    type: "error",
    code: "failed",
  });
}
