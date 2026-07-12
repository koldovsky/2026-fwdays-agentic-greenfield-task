/**
 * NACE catalog domain types (capability: nace-catalog).
 *
 * Pure data contracts — no React, no storage, no I/O (TC-STACK-04).
 * Behavior spec: openspec/specs/nace-catalog/spec.md (FR-NACE-01..05).
 */

/**
 * NACE 2.1-UA class codes carried by the MVP seed entries (FR-NACE-01).
 * A class code is a broad grouping and is NOT unique per entry —
 * two seed entries legitimately share `74.12`.
 */
export type NaceClass = "74.12" | "74.14" | "59.12";

/**
 * Legacy КВЕД ДК 009:2010 class codes corresponding to the seed entries.
 * Internal data only — never rendered in UI, invoice output, or docs
 * (BC-NACE-01); the ЄДР runs on КВЕД until NACE 2.1-UA takes force on
 * 2027-01-01.
 */
export type LegacyKvedClass = "74.10" | "59.12";

/**
 * One catalog row: a billable service description keyed by its own stable
 * id, carrying a NACE 2.1-UA class code as a non-unique attribute
 * (FR-NACE-01, design D1).
 */
export type NaceEntry = {
  /** Stable kebab-case identity of the entry (the catalog key). */
  readonly id: string;
  /** NACE 2.1-UA class code (`XX.XX`); multiple entries may share one. */
  readonly naceClass: NaceClass;
  /** Official Ukrainian class name as published in docs/191_2025.pdf. */
  readonly officialNameUa: string;
  /** English invoice line text (UI-facing, printed on the document). */
  readonly lineTextEn: string;
  /** Ukrainian invoice line text (UI-facing, printed on the document). */
  readonly lineTextUa: string;
  /** Legacy КВЕД correspondence — data-only, never rendered (design D2). */
  readonly legacyKvedClass: LegacyKvedClass;
  /** Curated lowercase matcher keywords, Ukrainian and English (design D3). */
  readonly keywords: readonly string[];
};

/**
 * Result of the deterministic keyword matcher (FR-NACE-05, design D3).
 * A tie on the top score yields `ambiguous` — never a silent first-wins
 * pick; asking the clarifying question is the consuming UI's job.
 */
export type MatchResult =
  | { kind: "matched"; entry: NaceEntry }
  | { kind: "ambiguous"; candidates: NaceEntry[] }
  | { kind: "none" };
