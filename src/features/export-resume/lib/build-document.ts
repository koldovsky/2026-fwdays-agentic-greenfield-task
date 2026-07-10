// Builds the format-agnostic ExportDocument from the tailored bullets
// (add-resume-wizard §4, task 4.2; structured merge improve-tailoring-quality
// §4.3). Filters to the bullets the user kept (includedInExport — the loop's
// applyExportDefaults already excluded overclaim-risk by default, BC-HONESTY-02;
// this NEVER re-derives that, it only reads the flag), preserving order. The
// footer is passed in by the caller so this stays free of i18n/entitlement
// concerns: caller supplies the free-tier attribution line for a free export and
// omits it for a paid one (FR-EXPORT-04). Pure/framework-free (TC-PURE-01).
import type { Bullet } from "@/entities/bullet";
import type { CvDocument } from "@/entities/cv-profile";
import type {
  ExportContact,
  ExportDocument,
  ExportExperienceRole,
  ExportSections,
} from "@/entities/export-document";

export interface BuildExportDocumentOptions {
  readonly headline?: string;
  readonly footer?: string;
  /**
   * Optional sectioned CV parse (§4.1). When supplied the builder emits a
   * structured document (contact/summary/experience/skills/education); when
   * absent it emits the flat bullets-only document (backward compatible, §4.4
   * flat fallback).
   */
  readonly cvDocument?: CvDocument;
}

/** The kept, exportable bullets — the ONE honesty gate (BC-HONESTY-02). */
function keptBullets(bullets: readonly Bullet[]): Bullet[] {
  return bullets.filter((bullet) => bullet.includedInExport);
}

/** Normalize CV / evidence text for tolerant matching (case + whitespace). */
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Best-effort source role for a kept bullet (T5 #7, client-only, no persistence).
 * A bullet grounded in a CV sentence is placed under the first role whose original
 * text contains that sentence (matched tolerantly, either direction). A bullet
 * with no CV-sentence evidence — user-confirmed, or an overclaim-risk bullet the
 * user opted back in — or with no match returns `null`, and the caller falls back
 * to the most-recent role. This never fabricates: placement follows real grounding
 * evidence, and the fallback is the pre-existing honest default. Returns the role
 * index, or `null` when unattributable.
 */
function attributeRoleIndex(bullet: Bullet, roles: CvDocument["experience"]): number | null {
  if (bullet.source?.kind !== "cv") return null;
  const evidence = normalizeForMatch(bullet.source.sentence);
  if (evidence === "") return null;
  for (let index = 0; index < roles.length; index += 1) {
    const matches = roles[index].bullets.some((line) => {
      const normalized = normalizeForMatch(line);
      return normalized !== "" && (normalized.includes(evidence) || evidence.includes(normalized));
    });
    if (matches) return index;
  }
  return null;
}

/** Copy the parsed contact block into the export contact (PII, render-only). */
function toExportContact(contact: NonNullable<CvDocument["contact"]>): ExportContact {
  return {
    ...(contact.name !== undefined ? { name: contact.name } : {}),
    ...(contact.email !== undefined ? { email: contact.email } : {}),
    ...(contact.phone !== undefined ? { phone: contact.phone } : {}),
    ...(contact.links !== undefined && contact.links.length > 0 ? { links: contact.links } : {}),
  };
}

/**
 * Merge kept tailored bullets into the parsed experience (§4.3). HONESTY:
 * the ONLY bullet content that ever reaches any role is `kept` — the tailored
 * bullets the user retained (excluded overclaim bullets were dropped before
 * this function and can appear in NO role, BC-HONESTY-02). The parsed roles'
 * ORIGINAL bullets are NOT re-inserted (they were never grounding-checked by the
 * tailoring pass), so the resume shows only grounded/kept content. Role titles +
 * date ranges pass through in the CV's original language (factual, from the
 * candidate's own CV).
 *
 * PLACEMENT (T5 #7, best-effort): each kept bullet lands under its source role,
 * derived from its grounding evidence (attributeRoleIndex); a bullet that cannot
 * be attributed falls back to the first (most recent) role — the pre-existing
 * honest default. Generation order is preserved within each role. The union of
 * bullets across all roles is exactly `kept`, so nothing is added or dropped
 * (keeps the server text-membership export gate satisfied).
 */
function mergeExperience(
  roles: CvDocument["experience"],
  kept: readonly Bullet[],
): ExportExperienceRole[] {
  if (roles.length === 0) return [];
  const perRole: string[][] = roles.map(() => []);
  for (const bullet of kept) {
    const attributed = attributeRoleIndex(bullet, roles);
    perRole[attributed ?? 0].push(bullet.text);
  }
  return roles.map((role, index) => ({
    title: role.title,
    ...(role.dateRange !== undefined ? { dateRange: role.dateRange.raw } : {}),
    bullets: perRole[index],
  }));
}

function buildSections(doc: CvDocument, kept: readonly Bullet[]): ExportSections {
  const experience = mergeExperience(doc.experience, kept);
  return {
    ...(doc.contact !== undefined ? { contact: toExportContact(doc.contact) } : {}),
    ...(doc.summary !== undefined && doc.summary.length > 0 ? { summary: doc.summary } : {}),
    ...(experience.length > 0 ? { experience } : {}),
    ...(doc.skills.length > 0 ? { skills: doc.skills } : {}),
    ...(doc.education !== undefined && doc.education.length > 0 ? { education: doc.education } : {}),
  };
}

export function buildExportDocument(
  bullets: readonly Bullet[],
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  const kept = keptBullets(bullets);
  const keptTexts = kept.map((bullet) => bullet.text);
  // Structured sections only when a parse is supplied AND it yielded a section
  // worth rendering; otherwise the flat bullets-only document (flat fallback).
  const sections =
    options.cvDocument !== undefined ? buildSections(options.cvDocument, kept) : undefined;
  const hasSections = sections !== undefined && Object.keys(sections).length > 0;
  return {
    ...(options.headline !== undefined && options.headline !== ""
      ? { headline: options.headline }
      : {}),
    // Flat bullets stay populated as the plain-text body + renderer fallback.
    bullets: keptTexts,
    ...(hasSections ? { sections } : {}),
    ...(options.footer !== undefined && options.footer !== "" ? { footer: options.footer } : {}),
  };
}
