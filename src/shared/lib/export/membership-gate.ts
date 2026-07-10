// Pure server-side export honesty gate (server-side-export-gate, T5 #8,
// BC-HONESTY-02, NFR-SEC-04). The pdf/docx export routes render bullet TEXT the
// client authored; shape validation alone lets a crafted POST inject arbitrary
// (fabricated) prose into the export. This gate closes that: it verifies that
// EVERY bullet text in the export document is a MEMBER of the texts the tailoring
// pipeline actually persisted for that run.
//
// It is a MEMBERSHIP check, NOT an `included` filter — a user may legitimately
// opt an overclaim-risk bullet back into the export (FR-BULLETS-02), and that
// toggle is client-only state, so filtering by `included` would wrongly reject a
// valid re-inclusion. The attack we close is FABRICATION (text that never came
// from the pipeline), so we allow any persisted bullet text regardless of its
// `included` flag.
//
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO. Takes primitives so it
// stays in shared/lib (below entities) and is unit-testable in isolation.

/**
 * The minimal export-document shape this gate inspects — the two places
 * pipeline-authored bullet text can appear: the flat `bullets` list and each
 * experience role's `bullets` (improve-tailoring-quality §4.2/§4.3). Contact /
 * summary / skills / education / headline / dateRange are client-supplied and NOT
 * grounding-gated, so they are intentionally absent here. Structurally a subset
 * of `ExportDocument` (entities/export-document), so the route passes that value
 * directly without a conversion.
 */
export interface ExportGateDocument {
  readonly bullets: readonly string[];
  readonly sections?: {
    readonly experience?: readonly { readonly bullets: readonly string[] }[];
  };
}

/**
 * Every bullet text carried by the document, across the flat list and all
 * experience-role bullets, in document order. Pure (no dedup — callers only need
 * membership, and order/count are irrelevant to the check).
 */
export function collectExportBulletTexts(doc: ExportGateDocument): string[] {
  const texts: string[] = [...doc.bullets];
  for (const role of doc.sections?.experience ?? []) {
    texts.push(...role.bullets);
  }
  return texts;
}

/**
 * True when every bullet text in `doc` is present in `allowedTexts` (the set of
 * texts the pipeline persisted for the tailoring). An empty document (no bullets
 * anywhere) is vacuously grounded — there is no fabricated text to reject; the
 * paywall + shape gates upstream still apply.
 *
 * Exact string equality is intentional: the persisted rows ARE the pipeline's
 * verbatim output, so a legitimate export echoes them byte-for-byte. Any edit /
 * fabrication that changes a character is (correctly) rejected — this is a
 * security boundary, not a fuzzy match (NFR-SEC-04).
 */
export function isExportGrounded(
  doc: ExportGateDocument,
  allowedTexts: ReadonlySet<string>,
): boolean {
  return collectExportBulletTexts(doc).every((text) => allowedTexts.has(text));
}
