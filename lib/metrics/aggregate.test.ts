import { describe, expect, it } from "vitest";
import {
  aggregateMetrics,
  buildLanguages,
  buildProfile,
  buildTopRepos,
  buildUserStats,
  wholeYears,
} from "./aggregate";
import type { RawEvent, RawRepo, RawUser } from "@/lib/github/types";

const NOW = new Date("2026-07-06T00:00:00Z");

function user(overrides: Partial<RawUser> = {}): RawUser {
  return {
    login: "octocat",
    name: "The Octocat",
    avatar_url: "https://example.com/a.png",
    bio: "hi",
    location: "SF",
    blog: "octo.dev",
    company: "@github",
    html_url: "https://github.com/octocat",
    followers: 42,
    following: 30,
    public_gists: 7,
    public_repos: 5,
    created_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

function repo(overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    name: "repo",
    html_url: "https://github.com/octocat/repo",
    description: null,
    fork: false,
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    size: 0,
    pushed_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function event(type: string, created_at = "2026-06-01T00:00:00Z"): RawEvent {
  return { type, created_at };
}

describe("wholeYears (FR-METRIC-06)", () => {
  it("counts whole years, flooring partial years", () => {
    // 3 years and 2 months before NOW.
    expect(wholeYears(new Date("2023-05-06T00:00:00Z"), NOW)).toBe(3);
  });

  it("returns 0 before the first anniversary", () => {
    expect(wholeYears(new Date("2026-01-01T00:00:00Z"), NOW)).toBe(0);
  });

  it("never goes negative for future dates", () => {
    expect(wholeYears(new Date("2030-01-01T00:00:00Z"), NOW)).toBe(0);
  });
});

describe("aggregateMetrics (FR-METRIC-01..15)", () => {
  const repos: RawRepo[] = [
    repo({ language: "TypeScript", stargazers_count: 3, forks_count: 1, watchers_count: 10, size: 100, fork: false }),
    repo({ language: "TypeScript", stargazers_count: 0, forks_count: 0, watchers_count: 0, size: 250, fork: false }),
    repo({ language: "Go", stargazers_count: 5, forks_count: 2, watchers_count: 5, size: 0, fork: false }),
    repo({ language: null, stargazers_count: 0, forks_count: 0, watchers_count: 0, size: 0, fork: true }),
    repo({ language: "Go", stargazers_count: 0, forks_count: 0, watchers_count: 0, size: 0, fork: true }),
  ];
  const events: RawEvent[] = [
    event("PushEvent"),
    event("PushEvent"),
    event("PushEvent"),
    event("PushEvent"),
    event("PullRequestEvent"),
    event("PullRequestEvent"),
    event("IssuesEvent"),
  ];
  const m = aggregateMetrics(user(), repos, events, NOW);

  it("sums stars, forks, watchers, and size", () => {
    expect(m.totalStars).toBe(8);
    expect(m.totalForks).toBe(3);
    expect(m.totalWatchers).toBe(15);
    expect(m.codeVolumeKb).toBe(350);
  });

  it("reads profile counts", () => {
    expect(m.followers).toBe(42);
    expect(m.following).toBe(30);
    expect(m.publicGists).toBe(7);
    expect(m.accountAgeYears).toBe(6);
  });

  it("counts original vs forked repos", () => {
    expect(m.originalRepos).toBe(3);
    expect(m.forkedRepos).toBe(2);
  });

  it("counts distinct non-null languages", () => {
    expect(m.languageDiversity).toBe(2);
  });

  it("counts events by type in the 90d window", () => {
    expect(m.commitActivity).toBe(4);
    expect(m.prActivity).toBe(2);
    expect(m.issueActivity).toBe(1);
    expect(m.releases).toBe(0);
  });

  it("excludes events older than 90 days", () => {
    const stale = aggregateMetrics(user(), [], [event("PushEvent", "2026-01-01T00:00:00Z")], NOW);
    expect(stale.commitActivity).toBe(0);
  });

  it("handles the empty case without throwing", () => {
    const empty = aggregateMetrics(user({ followers: 0, following: 0, public_gists: 0 }), [], [], NOW);
    expect(empty.totalStars).toBe(0);
    expect(empty.languageDiversity).toBe(0);
    expect(empty.originalRepos).toBe(0);
  });
});

describe("buildLanguages (FR-LANG-01/02)", () => {
  it("ranks by count, computes share, excludes null languages", () => {
    const langs = buildLanguages([
      repo({ language: "TypeScript" }),
      repo({ language: "TypeScript" }),
      repo({ language: "Go" }),
      repo({ language: null }),
    ]);
    expect(langs.map((l) => l.name)).toEqual(["TypeScript", "Go"]);
    expect(langs[0].count).toBe(2);
    expect(langs[0].pct).toBeCloseTo(2 / 3);
    expect(langs[1].pct).toBeCloseTo(1 / 3);
  });

  it("attaches GitHub colors and null for unknown languages", () => {
    const langs = buildLanguages([
      repo({ language: "TypeScript" }),
      repo({ language: "Brainfuck" }),
    ]);
    expect(langs.find((l) => l.name === "TypeScript")?.color).toBe("#3178c6");
    expect(langs.find((l) => l.name === "Brainfuck")?.color).toBeNull();
  });

  it("returns an empty list when no repo has a language", () => {
    expect(buildLanguages([repo({ language: null })])).toEqual([]);
  });
});

describe("buildProfile", () => {
  it("normalizes a bare blog URL", () => {
    expect(buildProfile(user({ blog: "octo.dev" })).blog).toBe("https://octo.dev");
    expect(buildProfile(user({ blog: "https://x.dev" })).blog).toBe("https://x.dev");
    expect(buildProfile(user({ blog: "  " })).blog).toBeNull();
    expect(buildProfile(user({ blog: null })).blog).toBeNull();
  });

  it("carries the created_at timestamp for the joined year", () => {
    expect(buildProfile(user({ created_at: "2022-03-01T00:00:00Z" })).createdAt).toBe(
      "2022-03-01T00:00:00Z",
    );
  });
});

describe("buildTopRepos (top repositories)", () => {
  it("ranks by stars desc, breaks ties by newer push, caps at limit", () => {
    const repos = [
      repo({ name: "b", stargazers_count: 410, pushed_at: "2025-11-01T00:00:00Z" }),
      repo({ name: "a", stargazers_count: 410, pushed_at: "2026-04-01T00:00:00Z" }),
      repo({ name: "top", stargazers_count: 2100, pushed_at: "2026-06-01T00:00:00Z" }),
      repo({ name: "low", stargazers_count: 5, pushed_at: "2026-05-01T00:00:00Z" }),
    ];
    const top = buildTopRepos(repos, 3);
    expect(top.map((r) => r.name)).toEqual(["top", "a", "b"]); // tie 410: a (Apr) before b (Nov'25)
    expect(top).toHaveLength(3);
  });

  it("carries display fields incl. language color", () => {
    const [r] = buildTopRepos([
      repo({ name: "x", language: "Go", stargazers_count: 9, description: "hi", html_url: "https://github.com/o/x" }),
    ]);
    expect(r).toMatchObject({ name: "x", stars: 9, description: "hi", language: "Go", languageColor: "#00ADD8", htmlUrl: "https://github.com/o/x" });
  });

  it("is empty-safe and null-language safe", () => {
    expect(buildTopRepos([])).toEqual([]);
    expect(buildTopRepos([repo({ language: null })])[0].languageColor).toBeNull();
  });
});

describe("buildUserStats", () => {
  it("assembles login, profile, metrics, and languages", () => {
    const stats = buildUserStats(user(), [repo({ language: "Go", stargazers_count: 2 })], [], NOW);
    expect(stats.login).toBe("octocat");
    expect(stats.profile.name).toBe("The Octocat");
    expect(stats.metrics.totalStars).toBe(2);
    expect(stats.languages[0].name).toBe("Go");
  });
});
