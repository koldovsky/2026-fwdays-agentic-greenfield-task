// Public API of the export-cover-letter feature (add-tailoring-intelligence §4).
// Composes only lower layers (entities/export-document, shared) — no feature→
// feature imports (FSD rule).
export { buildCoverLetterDocument, type BuildCoverLetterOptions } from "./lib/build-document";
export { requestCoverLetter } from "./api/request-cover-letter";
