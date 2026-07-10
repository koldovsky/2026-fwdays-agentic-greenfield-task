// Client-side reader for POST /api/tailor (FR-TAILOR-01/02) — the one-shot
// path. Thin wrapper over the shared NDJSON reader; a non-ok response degrades
// to a single calm `failed` event (NFR-OBS-01).
import type { TailorRunEvent, TailoringRunInput } from "../model/types";
import { readNdjson } from "./read-ndjson";

export function streamTailoring(
  input: TailoringRunInput,
): AsyncGenerator<TailorRunEvent, void, void> {
  return readNdjson<TailorRunEvent>("/api/tailor", input, { type: "error", code: "failed" });
}
