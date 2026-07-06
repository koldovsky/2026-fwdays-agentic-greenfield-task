// Pure display formatters for metric values. The numbers are the hero of the UI
// (DESIGN.md), so large counts are compacted — 5.6k, 2.4M — and set in the serif
// by the component that renders them.

/** Compact a count: 950 → "950", 5600 → "5.6k", 2_400_000 → "2.4M". */
export function formatCompact(n: number): string {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
  // DESIGN.md samples use a lowercase "k" (5.6k) but keep M/B/T uppercase.
  return compact.replace(/K$/, "k");
}

/** Whole years with a "y" suffix (account age): 5 → "5y". */
export function formatYears(years: number): string {
  return `${years}y`;
}

/**
 * Repo `size` is reported by GitHub in KB. Present it as a human size:
 * 350 → "350 KB", 1_200 → "1.2 MB", 3_000_000 → "2.9 GB".
 */
export function formatKb(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${trim(mb)} MB`;
  return `${trim(mb / 1024)} GB`;
}

function trim(n: number): string {
  // One decimal, but drop a trailing ".0".
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Short month + year for a repo's last activity: "2026-06-01" → "Jun 2026". */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
