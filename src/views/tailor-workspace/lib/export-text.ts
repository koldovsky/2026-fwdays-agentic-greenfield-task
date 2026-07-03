// Slice-local pure helper: the plain-text export body (add-payments-emulator
// task 2.1). Only bullets the user kept included make it out — overclaim-risk
// bullets excluded by default never leak into an export (BC-HONESTY-02).
// Plain text is the paywalled export's MVP payload; PDF/DOCX rendering
// (FR-EXPORT-01/02) arrives with the wizard's terminal step.
import type { Bullet } from "@/entities/bullet";

export function buildExportText(bullets: readonly Bullet[]): string {
  return bullets
    .filter((bullet) => bullet.includedInExport)
    .map((bullet) => `- ${bullet.text}`)
    .join("\n");
}
