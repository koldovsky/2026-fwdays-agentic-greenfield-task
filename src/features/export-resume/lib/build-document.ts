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

/** The kept, exportable bullet texts — the ONE honesty gate (BC-HONESTY-02). */
function keptBulletTexts(bullets: readonly Bullet[]): string[] {
  return bullets.filter((bullet) => bullet.includedInExport).map((bullet) => bullet.text);
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
 * tailoring pass and there is no per-bullet role mapping in the Bullet model),
 * so the resume shows only grounded/kept content. Role titles + date ranges pass
 * through in the CV's original language (factual, from the candidate's own CV).
 * The kept bullets attach to the first (most recent) role; later roles keep
 * their factual title/dates with no bullets rather than risk stale claims.
 */
function mergeExperience(
  roles: CvDocument["experience"],
  kept: readonly string[],
): ExportExperienceRole[] {
  if (roles.length === 0) return [];
  return roles.map((role, index) => ({
    title: role.title,
    ...(role.dateRange !== undefined ? { dateRange: role.dateRange.raw } : {}),
    bullets: index === 0 ? [...kept] : [],
  }));
}

function buildSections(doc: CvDocument, kept: readonly string[]): ExportSections {
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
  const kept = keptBulletTexts(bullets);
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
    bullets: kept,
    ...(hasSections ? { sections } : {}),
    ...(options.footer !== undefined && options.footer !== "" ? { footer: options.footer } : {}),
  };
}
