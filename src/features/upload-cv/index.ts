// Public API for the upload-cv feature (add-upload-cv, FR-CV-01,
// TC-PARSE-01/02). Other layers import ONLY this barrel (FSD slice
// public-API rule, docs/system-design.md §5.4).
export { UploadCvDropzone, type UploadCvDropzoneProps } from "./ui/UploadCvDropzone";
export type { ParseCvOutcome, UploadCvErrorCode } from "./model/types";
