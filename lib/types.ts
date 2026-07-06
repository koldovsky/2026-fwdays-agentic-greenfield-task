// Core domain types for GitHub Battle.
//
// This module is framework-free (no next/*, react, or DOM globals) so the
// aggregation and scoring functions that produce these shapes stay 100%
// unit-testable (TC-PURE-01, FR-DATA-04).

/** The fifteen scored metric keys (FR-METRIC-01..15). */
export type MetricKey =
  | "totalStars" // FR-METRIC-01
  | "totalForks" // FR-METRIC-02
  | "followers" // FR-METRIC-03
  | "originalRepos" // FR-METRIC-04
  | "languageDiversity" // FR-METRIC-05
  | "accountAgeYears" // FR-METRIC-06
  | "commitActivity" // FR-METRIC-07 (PushEvent, 90d)
  | "prActivity" // FR-METRIC-08 (PullRequestEvent, 90d)
  | "issueActivity" // FR-METRIC-09 (IssuesEvent, 90d)
  | "releases" // FR-METRIC-10 (ReleaseEvent, 90d)
  | "publicGists" // FR-METRIC-11
  | "totalWatchers" // FR-METRIC-12
  | "codeVolumeKb" // FR-METRIC-13
  | "following" // FR-METRIC-14
  | "forkedRepos"; // FR-METRIC-15

/** The fifteen metrics as a flat record of numeric values. */
export type Metrics = Record<MetricKey, number>;

/** Profile fields rendered on the stats/battle views (FR-STATS-01). */
export interface UserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  /** Personal site / blog URL, normalized to include a scheme, or null. */
  blog: string | null;
  company: string | null;
  htmlUrl: string;
  /** ISO 8601 account creation timestamp (for the joined year). */
  createdAt: string;
}

/** One slice of the language-breakdown chart (FR-LANG-01/02). */
export interface LanguageSlice {
  name: string;
  /** Number of repos whose primary language is this one. */
  count: number;
  /** Share of language-bearing repos, 0..1. */
  pct: number;
  /** GitHub's canonical color for the language (hex), or null if unknown. */
  color: string | null;
}

/** One entry in the top-repositories list (user-stats: top repositories). */
export interface RepoSummary {
  name: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  /** GitHub's color for the language (hex), or null if unknown. */
  languageColor: string | null;
  stars: number;
  /** ISO 8601 last-activity timestamp (for the row's month/year + tie-break). */
  pushedAt: string;
}

/** The typed result of aggregating one user's raw GitHub payloads. */
export interface UserStats {
  login: string;
  profile: UserProfile;
  metrics: Metrics;
  languages: LanguageSlice[];
  /** Up to ten most-starred repos, ties broken by recency. */
  topRepos: RepoSummary[];
}

/** Which side won: `a`, `b`, or a `draw` (FR-SCORE-03, FR-BATTLE-03). */
export type Side = "a" | "b" | "draw";

/** Per-metric head-to-head outcome for the UI to render (FR-SCORE-03). */
export interface MetricOutcome {
  key: MetricKey;
  aValue: number;
  bValue: number;
  winner: Side;
}

/** The full scored battle (FR-SCORE-01..03). */
export interface BattleResult {
  outcomes: MetricOutcome[];
  /** Points out of 15 (ties contribute 0.5 to each). */
  scoreA: number;
  scoreB: number;
  winner: Side;
}
