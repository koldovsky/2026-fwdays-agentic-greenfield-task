// @trace FR-CYCLE-04
import { describe, expect, it } from "vitest";
import { deriveStatus, daysRemaining, isResponseComplete } from "@/lib/cycles/status";

/**
 * Red-first unit tests for the cycle status lifecycle (FR-CYCLE-04). The module
 * does not exist yet, so this suite MUST fail red. All rules are pure with the
 * clock INJECTED (`now` is a fixed Date), so the tests are deterministic and
 * never wall-clock-coupled.
 *
 * Rules under test (from design.md "status.ts"):
 *   deriveStatus  — `done` if completedAt set (even past deadline); else
 *                   `expired` if now > deadline; else `collecting`.
 *   daysRemaining — > 0 for a future deadline, <= 0 (overdue) for a past one.
 *   isResponseComplete — every REQUIRED snapshot question has a valid answer
 *                   (scale ⇒ value matching an anchor; open ⇒ non-empty text);
 *                   optional questions may be unanswered.
 *
 * `now` shape: assumed `(args, now: Date)`. `isResponseComplete(snapshot,
 * answers)` is assumed to take answers as a record keyed by question id, scale
 * answers as a number, open answers as a string — see the note in the report.
 */

const NOW = new Date("2026-06-28T12:00:00.000Z");
const FUTURE = new Date("2026-07-15T00:00:00.000Z");
const PAST = new Date("2026-06-01T00:00:00.000Z");

describe("deriveStatus", () => {
  it("returns collecting when not completed and deadline is in the future", () => {
    expect(deriveStatus({ completedAt: null, deadline: FUTURE }, NOW)).toBe("collecting");
  });

  it("returns expired when not completed and deadline has passed", () => {
    expect(deriveStatus({ completedAt: null, deadline: PAST }, NOW)).toBe("expired");
  });

  it("returns done when completedAt is set and deadline is still in the future", () => {
    const completedAt = new Date("2026-06-20T00:00:00.000Z");
    expect(deriveStatus({ completedAt, deadline: FUTURE }, NOW)).toBe("done");
  });

  it("returns done (done stays done) even when the deadline has passed", () => {
    const completedAt = new Date("2026-05-20T00:00:00.000Z");
    expect(deriveStatus({ completedAt, deadline: PAST }, NOW)).toBe("done");
  });

  it("always returns exactly one of collecting | done | expired", () => {
    const values = [
      deriveStatus({ completedAt: null, deadline: FUTURE }, NOW),
      deriveStatus({ completedAt: null, deadline: PAST }, NOW),
      deriveStatus({ completedAt: NOW, deadline: PAST }, NOW),
    ];
    for (const value of values) {
      expect(["collecting", "done", "expired"]).toContain(value);
    }
  });
});

describe("deriveStatus — deadline-day inclusive boundary", () => {
  const today = new Date("2026-06-29T08:31:00.000Z");
  const todayDeadline = new Date("2026-06-29T00:00:00.000Z"); // due today
  const tomorrowDeadline = new Date("2026-06-30T00:00:00.000Z"); // due tomorrow
  const yesterdayDeadline = new Date("2026-06-28T00:00:00.000Z"); // day passed

  it("a deadline due TODAY is still collecting (not expired)", () => {
    expect(deriveStatus({ completedAt: null, deadline: todayDeadline }, today)).toBe("collecting");
  });

  it("a deadline due TOMORROW is collecting", () => {
    expect(deriveStatus({ completedAt: null, deadline: tomorrowDeadline }, today)).toBe("collecting");
  });

  it("a deadline whose day has fully passed is expired", () => {
    expect(deriveStatus({ completedAt: null, deadline: yesterdayDeadline }, today)).toBe("expired");
  });
});

describe("daysRemaining", () => {
  it("is positive for a future deadline", () => {
    expect(daysRemaining(FUTURE, NOW)).toBeGreaterThan(0);
  });

  it("is <= 0 (overdue) for a past deadline", () => {
    expect(daysRemaining(PAST, NOW)).toBeLessThanOrEqual(0);
  });

  it("counts whole calendar days, deadline-day inclusive (tomorrow = 1, not 0)", () => {
    const today = new Date("2026-06-29T20:00:00.000Z");
    expect(daysRemaining(new Date("2026-06-30T00:00:00.000Z"), today)).toBe(1);
    expect(daysRemaining(new Date("2026-06-29T00:00:00.000Z"), today)).toBe(0);
    expect(daysRemaining(new Date("2026-06-28T00:00:00.000Z"), today)).toBe(-1);
  });
});

/**
 * A snapshot with one REQUIRED scale question, one REQUIRED open question, and
 * one OPTIONAL open question — so completeness ignores the optional one.
 */
const snapshot = {
  name: "Probation check-in",
  methodology: "probation",
  questions: [
    {
      id: "q-scale",
      order: 1,
      text: "How clearly were the expectations communicated?",
      type: "scale",
      required: true,
      anchors: [
        { value: 1, label: "Not at all" },
        { value: 2, label: "Somewhat" },
        { value: 3, label: "Clearly" },
      ],
    },
    {
      id: "q-open-req",
      order: 2,
      text: "What would you change?",
      type: "open",
      required: true,
    },
    {
      id: "q-open-opt",
      order: 3,
      text: "Anything else?",
      type: "open",
      required: false,
    },
  ],
};

describe("isResponseComplete", () => {
  it("is true when every required question has a valid answer (optional unanswered)", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-scale": 3,
        "q-open-req": "Clearer onboarding checklist",
      }),
    ).toBe(true);
  });

  it("is true when the optional question is also answered", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-scale": 2,
        "q-open-req": "More 1:1 time",
        "q-open-opt": "Thanks for the support",
      }),
    ).toBe(true);
  });

  it("is false when a required open answer is missing", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-scale": 3,
      }),
    ).toBe(false);
  });

  it("is false when a required open answer is empty / whitespace-only text", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-scale": 3,
        "q-open-req": "   ",
      }),
    ).toBe(false);
  });

  it("is false when a required scale answer is missing", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-open-req": "Clearer onboarding",
      }),
    ).toBe(false);
  });

  it("is false when a required scale answer is not one of the anchor values", () => {
    expect(
      isResponseComplete(snapshot, {
        "q-scale": 9,
        "q-open-req": "Clearer onboarding",
      }),
    ).toBe(false);
  });

  it("is false when an empty answer set is given against required questions", () => {
    expect(isResponseComplete(snapshot, {})).toBe(false);
  });
});
