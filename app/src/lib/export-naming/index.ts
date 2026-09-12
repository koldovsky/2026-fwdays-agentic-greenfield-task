import type { ParsedTicket } from '../jira-parser'

export interface ExportPaths {
  /** Ticket folder under Downloads, e.g. `ROVODEV-36` (FR-15). */
  folder: string
  /** Markdown file name, e.g. `ROVODEV-36-<title>.md` (FR-16). */
  mdFileName: string
  /** Relative download path for the `.md` file, e.g. `ROVODEV-36/ROVODEV-36-<title>.md`. */
  mdPath: string
  /** Relative media subfolder, e.g. `ROVODEV-36/media` (FR-16). */
  mediaDir: string
}

// eslint-disable-next-line no-control-regex -- stripping control chars is intentional for filesystem safety
const FORBIDDEN_CHARS = /[<>:"/\\|?*\x00-\x1F]/g
const MAX_TITLE_LENGTH = 100

/**
 * Strips only filesystem-forbidden characters and collapses whitespace, keeping
 * Cyrillic and every other legal character verbatim — no transliteration (FR-18).
 */
function sanitizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').replace(FORBIDDEN_CHARS, '').trim().slice(0, MAX_TITLE_LENGTH).trim()
}

/**
 * Derives the `Downloads/<TICKET-ID>/` folder, the `<TICKET-ID>-<title>.md` file,
 * and the `media/` subfolder from a ticket (FR-15, FR-16, FR-18). Pure — no Chrome
 * or DOM APIs, so it is fully unit-testable (NFR-07).
 */
export function buildExportPaths(ticket: ParsedTicket): ExportPaths {
  const folder = ticket.key.replace(FORBIDDEN_CHARS, '').trim()
  const safeTitle = sanitizeTitle(ticket.title)
  const mdFileName = safeTitle ? `${folder}-${safeTitle}.md` : `${folder}.md`
  return {
    folder,
    mdFileName,
    mdPath: `${folder}/${mdFileName}`,
    mediaDir: `${folder}/media`,
  }
}
