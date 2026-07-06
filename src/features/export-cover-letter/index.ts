// Public API of the export-cover-letter feature (add-tailoring-intelligence §4).
// Composes only lower layers (entities/export-document, shared) — no feature→
// feature imports (FSD rule).
export {
  buildCoverLetterDocument,
  buildGroundedCoverLetterDocument,
  type BuildCoverLetterOptions,
} from "./lib/build-document";
export {
  generateGroundedCoverLetter,
  type GenerateGroundedLetterDeps,
} from "./lib/generate-grounded-letter";
export {
  requestCoverLetter,
  type CoverLetterContext,
  type CoverLetterFraming,
} from "./api/request-cover-letter";
