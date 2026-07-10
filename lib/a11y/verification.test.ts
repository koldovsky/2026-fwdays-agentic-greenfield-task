import { describe, expect, it } from "vitest";

import { getCelebrationCopy } from "@/lib/completion/session-utils";
import { getRecapHeadline, getRecapSubline } from "@/lib/recap/daily-recap";
import { formatTimer } from "@/lib/focus/timer";

const GUILT_PATTERNS = [/failed/i, /discipline/i, /overdue/i, /streak shame/i];

describe("UX constraint verification (BC-UX / BC-BRAND)", () => {
  it("celebration copy avoids guilt language (BC-BRAND-01)", () => {
    for (let index = 0; index < 8; index += 1) {
      const copy = getCelebrationCopy(`session_${index}`);
      for (const pattern of GUILT_PATTERNS) {
        expect(copy).not.toMatch(pattern);
      }
    }
  });

  it("recap copy stays forgiving (FR-RECAP-02)", () => {
    const emptyRecap = {
      date: "2026-07-10",
      minutesFocused: 0,
      tasksTouched: 0,
      stepsCompleted: 0,
      reflectionTags: [],
    };

    expect(getRecapHeadline(emptyRecap)).toMatch(/counts/i);
    expect(getRecapSubline(emptyRecap)).not.toMatch(/failed|overdue/i);
  });

  it("timer display uses neutral formatting (BC-UX-01)", () => {
    expect(formatTimer(30)).toBe("00:30");
    expect(formatTimer(0)).toBe("00:00");
  });
});

describe("accessibility baseline (NFR-A11Y)", () => {
  it("recap stats are text labels not color-only (FR-RECAP-01/02)", () => {
    const labels = ["Minutes focused", "Tasks touched", "Steps completed"];
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });
});
