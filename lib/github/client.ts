// Keyless GitHub REST data layer (FR-DATA-01..07). Server-side only: it sets a
// descriptive User-Agent (a forbidden header in the browser), so these functions
// run from Server Components and Route Handlers (TC-DATA-01, FR-DATA-02).

import "server-only";

import type { UserStats } from "@/lib/types";
import type { RawEvent, RawRepo, RawUser } from "./types";
import { buildUserStats } from "@/lib/metrics/aggregate";

const API_BASE = "https://api.github.com";
const USER_AGENT = "github-battle-app (keyless; +https://github.com)";
const REPOS_PER_PAGE = 100;
const MAX_REPO_PAGES = 5; // safety cap: 5 pages × 100 = 500 repos (FR-DATA-03)

/** Discriminated outcome so callers render calm states, never an error boundary. */
export type FetchResult<T> =
  | { status: "ok"; data: T }
  | { status: "not-found" } // HTTP 404 (FR-DATA-06)
  | { status: "rate-limited" } // HTTP 403 rate-limit exhaustion (FR-DATA-05)
  | { status: "error"; message: string };

/** Existence-check outcome for pre-navigation validation (FR-LAND-04). */
export type ValidationResult = "found" | "not-found" | "rate-limited" | "error";

class RateLimitError extends Error {}
class NotFoundError extends Error {}

function isRateLimited(res: Response): boolean {
  if (res.status === 429) return true;
  return res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0";
}

/** Fetch a GitHub JSON resource, mapping 404 / rate-limit to typed errors. */
async function githubJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    // No token, and we manage freshness via our own session cache below.
    cache: "no-store",
  });

  if (res.status === 404) throw new NotFoundError(path);
  if (isRateLimited(res)) throw new RateLimitError(path);
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Validate that a username exists via `GET /users/{u}` (FR-LAND-04). */
export async function validateUser(username: string): Promise<ValidationResult> {
  const login = username.trim();
  if (!login) return "not-found";
  try {
    await githubJson<RawUser>(`/users/${encodeURIComponent(login)}`);
    return "found";
  } catch (err) {
    if (err instanceof NotFoundError) return "not-found";
    if (err instanceof RateLimitError) return "rate-limited";
    return "error";
  }
}

/** Follow repo pagination until exhausted or the safety cap (FR-DATA-03). */
async function fetchAllRepos(login: string): Promise<RawRepo[]> {
  const repos: RawRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await githubJson<RawRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=${REPOS_PER_PAGE}&page=${page}&sort=updated`,
    );
    repos.push(...batch);
    if (batch.length < REPOS_PER_PAGE) break; // last page reached
  }
  return repos;
}

// ── In-memory session cache (FR-DATA-07, NFR-RATE-01) ──
// Keyed by lowercased login; a short TTL keeps a re-navigated view fresh-ish
// without refetching on every hop.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; stats: UserStats }>();

function cacheGet(login: string): UserStats | null {
  const hit = cache.get(login.toLowerCase());
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(login.toLowerCase());
    return null;
  }
  return hit.stats;
}

/**
 * Fetch a user's profile, all repos, and events, then aggregate into UserStats.
 * Returns a typed result; never throws to an error boundary (FR-DATA-01/05/06).
 */
export async function getUserStats(username: string): Promise<FetchResult<UserStats>> {
  const login = username.trim();
  if (!login) return { status: "not-found" };

  const cached = cacheGet(login);
  if (cached) return { status: "ok", data: cached };

  try {
    // Profile first (it decides not-found); repos + events in parallel after.
    const user = await githubJson<RawUser>(`/users/${encodeURIComponent(login)}`);
    const [repos, events] = await Promise.all([
      fetchAllRepos(user.login),
      githubJson<RawEvent[]>(`/users/${encodeURIComponent(user.login)}/events?per_page=100`),
    ]);

    const stats = buildUserStats(user, repos, events, new Date());
    cache.set(user.login.toLowerCase(), { at: Date.now(), stats });
    return { status: "ok", data: stats };
  } catch (err) {
    if (err instanceof NotFoundError) return { status: "not-found" };
    if (err instanceof RateLimitError) return { status: "rate-limited" };
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
