// Pure battle scoring (FR-SCORE-01..04).
//
// SCORING DIRECTION: "higher is better" for ALL fifteen metrics (FR-SCORE-04).
// Every metric — stars, followers, activity, code volume, following count,
// forked-repo count — awards the point to the larger value. There are no
// inverted metrics; a bigger number always wins its round.
//
// This module is framework-free (no next/*, react, DOM) so it is fully
// unit-testable (TC-PURE-01).

import type { BattleResult, MetricOutcome, Side, UserStats } from "@/lib/types";
import { METRIC_KEYS } from "@/lib/metrics/catalog";

/**
 * Score two users head to head. For each of the fifteen metrics the higher value
 * scores 1 point; an exact tie scores 0.5 to each. Totals are out of 15. The
 * result names a winner, or a `draw` when totals are equal (FR-SCORE-02/03).
 */
export function scoreBattle(a: UserStats, b: UserStats): BattleResult {
  let scoreA = 0;
  let scoreB = 0;

  const outcomes: MetricOutcome[] = METRIC_KEYS.map((key) => {
    const aValue = a.metrics[key];
    const bValue = b.metrics[key];

    let winner: Side;
    if (aValue > bValue) {
      winner = "a";
      scoreA += 1;
    } else if (bValue > aValue) {
      winner = "b";
      scoreB += 1;
    } else {
      winner = "draw";
      scoreA += 0.5;
      scoreB += 0.5;
    }

    return { key, aValue, bValue, winner };
  });

  const winner: Side = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : "draw";

  return { outcomes, scoreA, scoreB, winner };
}
