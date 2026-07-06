import { describe, expect, it } from "vitest";
import { scoreBattle } from "./battle";
import type { Metrics, UserStats } from "@/lib/types";
import { METRIC_KEYS } from "@/lib/metrics/catalog";

const ZERO = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])) as Metrics;

function stats(login: string, metrics: Partial<Metrics>): UserStats {
  return {
    login,
    profile: {
      login,
      name: login,
      avatarUrl: "",
      bio: null,
      location: null,
      blog: null,
      company: null,
      htmlUrl: "",
      createdAt: "2020-01-01T00:00:00Z",
    },
    metrics: { ...ZERO, ...metrics },
    languages: [],
    topRepos: [],
  };
}

describe("scoreBattle (FR-SCORE-01..03)", () => {
  it("awards 1 point to the higher value per metric", () => {
    const a = stats("a", { totalStars: 10 });
    const b = stats("b", { totalStars: 5 });
    const result = scoreBattle(a, b);
    const stars = result.outcomes.find((o) => o.key === "totalStars")!;
    expect(stars.winner).toBe("a");
    // a wins stars (1), all other 14 are 0-0 ties (0.5 each).
    expect(result.scoreA).toBe(1 + 14 * 0.5);
    expect(result.scoreB).toBe(14 * 0.5);
    expect(result.winner).toBe("a");
  });

  it("splits a tied metric 0.5 / 0.5", () => {
    const result = scoreBattle(stats("a", {}), stats("b", {}));
    // Everything ties → 7.5 each, overall draw.
    expect(result.scoreA).toBe(7.5);
    expect(result.scoreB).toBe(7.5);
    expect(result.winner).toBe("draw");
    expect(result.outcomes.every((o) => o.winner === "draw")).toBe(true);
  });

  it("totals are always out of 15", () => {
    const a = stats("a", { totalStars: 100, followers: 50, codeVolumeKb: 9 });
    const b = stats("b", { totalForks: 3, following: 2 });
    const result = scoreBattle(a, b);
    expect(result.scoreA + result.scoreB).toBe(15);
  });

  it("names b the winner when b leads", () => {
    const a = stats("a", { totalStars: 1 });
    const b = stats("b", { totalStars: 2, followers: 9, following: 9 });
    const result = scoreBattle(a, b);
    expect(result.winner).toBe("b");
    expect(result.scoreB).toBeGreaterThan(result.scoreA);
  });

  it("returns fifteen outcomes in catalog order", () => {
    const result = scoreBattle(stats("a", {}), stats("b", {}));
    expect(result.outcomes).toHaveLength(15);
    expect(result.outcomes.map((o) => o.key)).toEqual([...METRIC_KEYS]);
  });

  it("declares a draw on equal totals from offsetting wins", () => {
    const a = stats("a", { totalStars: 5 });
    const b = stats("b", { totalForks: 5 });
    const result = scoreBattle(a, b);
    // a wins stars, b wins forks, other 13 tie → 7.5 each.
    expect(result.scoreA).toBe(result.scoreB);
    expect(result.winner).toBe("draw");
  });
});
