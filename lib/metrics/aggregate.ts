// Pure metric aggregation (FR-DATA-04, FR-METRIC-01..15, FR-LANG-01/02).
//
// These functions take raw GitHub payloads and return a typed UserStats. They
// import no next/*, react, or DOM globals (TC-PURE-01) and are deterministic —
// the reference date is injected so account-age math is testable.

import type {
  LanguageSlice,
  Metrics,
  RepoSummary,
  UserProfile,
  UserStats,
} from "@/lib/types";
import type { RawEvent, RawRepo, RawUser } from "@/lib/github/types";
import { languageColor } from "@/lib/github/language-colors";

/** Trailing activity window for the event-based metrics (FR-METRIC-07..10). */
export const EVENTS_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0);

/** Whole years between two dates (FR-METRIC-06). */
export function wholeYears(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const anniversary = new Date(from.getTime());
  anniversary.setFullYear(from.getFullYear() + years);
  if (anniversary.getTime() > to.getTime()) years -= 1;
  return Math.max(0, years);
}

/**
 * Count events of a given type within the trailing 90-day window. GitHub's
 * events endpoint already returns only recent public events; the window is a
 * belt-and-suspenders bound and is a documented approximation — the endpoint is
 * itself capped, so these reflect only what it returns (FR-METRIC-07..10).
 */
function countEvents(events: RawEvent[], type: string, now: Date): number {
  const floor = now.getTime() - EVENTS_WINDOW_DAYS * DAY_MS;
  return events.filter((e) => {
    if (e.type !== type) return false;
    const t = new Date(e.created_at).getTime();
    return Number.isFinite(t) && t >= floor && t <= now.getTime();
  }).length;
}

/** The fifteen metrics from raw payloads (FR-METRIC-01..15). */
export function aggregateMetrics(
  user: RawUser,
  repos: RawRepo[],
  events: RawEvent[],
  now: Date,
): Metrics {
  const languages = new Set<string>();
  for (const r of repos) {
    if (r.language) languages.add(r.language);
  }

  return {
    totalStars: sum(repos.map((r) => r.stargazers_count)),
    totalForks: sum(repos.map((r) => r.forks_count)),
    followers: user.followers,
    originalRepos: repos.filter((r) => !r.fork).length,
    languageDiversity: languages.size,
    accountAgeYears: wholeYears(new Date(user.created_at), now),
    commitActivity: countEvents(events, "PushEvent", now),
    prActivity: countEvents(events, "PullRequestEvent", now),
    issueActivity: countEvents(events, "IssuesEvent", now),
    releases: countEvents(events, "ReleaseEvent", now),
    publicGists: user.public_gists,
    totalWatchers: sum(repos.map((r) => r.watchers_count)),
    codeVolumeKb: sum(repos.map((r) => r.size)),
    following: user.following,
    forkedRepos: repos.filter((r) => r.fork).length,
  };
}

/**
 * Language breakdown: share of repos per primary language, ranked by count.
 * Repos with a null language are excluded (FR-LANG-01/02).
 */
export function buildLanguages(repos: RawRepo[]): LanguageSlice[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }

  const total = sum([...counts.values()]);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      pct: count / total,
      color: languageColor(name),
    }))
    // Rank by count desc; ties broken alphabetically for a stable order.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Rank repositories for the top-repositories list: star count descending, ties
 * broken by most-recent push (newest first); keep at most `limit`. Pure and
 * empty-safe (user-stats / github-data: top repositories).
 */
export function buildTopRepos(repos: RawRepo[], limit = 10): RepoSummary[] {
  return [...repos]
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      // Tie: newer last-push first.
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    })
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      htmlUrl: r.html_url,
      description: r.description,
      language: r.language,
      languageColor: r.language ? languageColor(r.language) : null,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }));
}

/** Normalize the profile fields the views render (FR-STATS-01). */
export function buildProfile(user: RawUser): UserProfile {
  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    location: user.location,
    blog: normalizeUrl(user.blog),
    company: user.company,
    htmlUrl: user.html_url,
    createdAt: user.created_at,
  };
}

/** Add a scheme to a bare blog URL; return null for empty/whitespace values. */
function normalizeUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Assemble the full typed UserStats from raw payloads. */
export function buildUserStats(
  user: RawUser,
  repos: RawRepo[],
  events: RawEvent[],
  now: Date,
): UserStats {
  return {
    login: user.login,
    profile: buildProfile(user),
    metrics: aggregateMetrics(user, repos, events, now),
    languages: buildLanguages(repos),
    topRepos: buildTopRepos(repos),
  };
}
