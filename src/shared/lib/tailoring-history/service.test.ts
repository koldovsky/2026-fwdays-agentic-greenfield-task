// tailoring-history service — list + owner-scoped get (IDOR, NFR-SEC-02).
import { describe, expect, it, vi } from "vitest";

import { getHistoryItem, listHistory } from "./service";
import type { TailoringRecord, TailoringSummary } from "@/shared/lib/db";

const SUMMARY: TailoringSummary = {
  id: "t-1",
  jobTitle: "Senior Engineer",
  matchScore: 80,
  createdAt: "2026-07-01T00:00:00.000Z",
};

function recordOwnedBy(userId: string): TailoringRecord {
  return {
    ...SUMMARY,
    userId,
    cvProfileId: null,
    jobDescriptionId: "jd-1",
    checklist: [],
    bullets: [],
  };
}

describe("listHistory", () => {
  it("returns the user's summaries from the repo", async () => {
    const stores = {
      tailorings: {
        listByUser: vi.fn().mockResolvedValue([SUMMARY]),
        findById: vi.fn(),
      },
    };
    expect(await listHistory(stores, "u-1")).toEqual([SUMMARY]);
    expect(stores.tailorings.listByUser).toHaveBeenCalledWith("u-1");
  });
});

describe("getHistoryItem (IDOR)", () => {
  it("returns the record when the caller owns it", async () => {
    const stores = {
      tailorings: {
        listByUser: vi.fn(),
        findById: vi.fn().mockResolvedValue(recordOwnedBy("u-1")),
      },
    };
    const got = await getHistoryItem(stores, "u-1", "t-1");
    expect(got?.id).toBe("t-1");
  });

  it("returns null for a record owned by another user (no existence disclosure)", async () => {
    const stores = {
      tailorings: {
        listByUser: vi.fn(),
        findById: vi.fn().mockResolvedValue(recordOwnedBy("someone-else")),
      },
    };
    expect(await getHistoryItem(stores, "u-1", "t-1")).toBeNull();
  });

  it("returns null when the id does not exist", async () => {
    const stores = {
      tailorings: {
        listByUser: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
      },
    };
    expect(await getHistoryItem(stores, "u-1", "missing")).toBeNull();
  });
});
