// The canonical, ordered catalog of the fifteen metrics. One definition drives
// the stats cards, the battle rows, and the scoring — so display and scoring
// never drift apart.

import type { MetricKey } from "@/lib/types";
import { metricLabels } from "@/lib/strings";
import { formatCompact, formatKb, formatYears } from "./format";

export interface MetricDef {
  key: MetricKey;
  label: string;
  /** Format a raw numeric value for display. */
  format: (value: number) => string;
}

/**
 * Ordered fifteen metrics (FR-METRIC-01..15). The order is the reveal order for
 * the stats grid and the battle rounds.
 */
export const METRICS: readonly MetricDef[] = [
  { key: "totalStars", label: metricLabels.totalStars, format: formatCompact },
  { key: "totalForks", label: metricLabels.totalForks, format: formatCompact },
  { key: "followers", label: metricLabels.followers, format: formatCompact },
  { key: "originalRepos", label: metricLabels.originalRepos, format: formatCompact },
  { key: "languageDiversity", label: metricLabels.languageDiversity, format: formatCompact },
  { key: "accountAgeYears", label: metricLabels.accountAgeYears, format: formatYears },
  { key: "commitActivity", label: metricLabels.commitActivity, format: formatCompact },
  { key: "prActivity", label: metricLabels.prActivity, format: formatCompact },
  { key: "issueActivity", label: metricLabels.issueActivity, format: formatCompact },
  { key: "releases", label: metricLabels.releases, format: formatCompact },
  { key: "publicGists", label: metricLabels.publicGists, format: formatCompact },
  { key: "totalWatchers", label: metricLabels.totalWatchers, format: formatCompact },
  { key: "codeVolumeKb", label: metricLabels.codeVolumeKb, format: formatKb },
  { key: "following", label: metricLabels.following, format: formatCompact },
  { key: "forkedRepos", label: metricLabels.forkedRepos, format: formatCompact },
] as const;

/** The fifteen keys in catalog order. */
export const METRIC_KEYS: readonly MetricKey[] = METRICS.map((m) => m.key);
