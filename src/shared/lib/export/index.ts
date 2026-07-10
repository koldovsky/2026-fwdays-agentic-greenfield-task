// Public API for the pure export helpers (shared/lib/export). Framework-free
// (TC-PURE-01) — imported by the pdf/docx export routes to enforce the
// server-side bullet-membership honesty gate (server-side-export-gate, T5 #8).
export {
  collectExportBulletTexts,
  isExportGrounded,
  type ExportGateDocument,
} from "./membership-gate";
