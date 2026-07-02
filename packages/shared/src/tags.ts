/**
 * Pure tag helpers, framework-free (TC-PURE-01). The History tag filter runs on the
 * client over the already-fetched entries (see design.md), so the predicate lives here
 * and is unit-tested.
 */
import type { TimeEntry } from './contracts';

/**
 * Filter entries to those carrying **at least one** of the selected tag ids (FR-TAG-04).
 * An empty selection returns all entries (no filter).
 */
export function filterEntriesByTags(
  entries: TimeEntry[],
  selectedTagIds: string[],
): TimeEntry[] {
  if (selectedTagIds.length === 0) return entries;
  const selected = new Set(selectedTagIds);
  return entries.filter((entry) => entry.tags.some((tag) => selected.has(tag.id)));
}
