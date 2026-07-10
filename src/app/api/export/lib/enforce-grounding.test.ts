// Unit tests for `enforceExportGrounding` + `groundingErrorResponse`
// (server-side-export-gate, T5 #8, BC-HONESTY-02, NFR-SEC-04) — the async edges
// (persisted-bullets read, IDOR ownership check, lifecycle status) around the
// pure `isExportGrounded` membership check. `createTailoringRepo`/`getDb` are
// mocked so only the route-facing logic in enforce-grounding.ts runs; the pure
// membership math itself is covered by shared/lib/export/membership-gate.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

const findExportGrant = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/db", () => ({ createTailoringRepo: () => ({ findExportGrant }) }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

import { enforceExportGrounding, groundingErrorResponse } from "./enforce-grounding";

const OWNER_ID = "user-1";
const OTHER_ID = "user-2";
const TAILORING_ID = "t-1";
const GROUNDED_TEXT = "Led migration of the billing service to Postgres.";
const FABRICATED_TEXT = "Personally briefed the board of directors weekly.";

const DOC: ExportDocument = { headline: "Tailored résumé", bullets: [GROUNDED_TEXT] };

const COMPLETE_GRANT = {
  id: TAILORING_ID,
  userId: OWNER_ID,
  status: "complete",
  bullets: [{ text: GROUNDED_TEXT }],
};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("enforceExportGrounding", () => {
  it("returns ok when every bullet text is a member of the persisted bullets, owned + complete", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);

    const verdict = await enforceExportGrounding(DOC, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("ok");
    expect(findExportGrant).toHaveBeenCalledWith(TAILORING_ID);
  });

  it("returns ok without ever calling the DB when the document has no bullet text anywhere (nothing to ground)", async () => {
    const bulletlessDoc: ExportDocument = { headline: "x", bullets: [] };

    const verdict = await enforceExportGrounding(bulletlessDoc, null, OWNER_ID);

    expect(verdict).toBe("ok");
    expect(findExportGrant).not.toHaveBeenCalled();
  });

  it("returns missing_tailoring when the doc HAS bullet text but tailoringId is null — the gate is mandatory, not opt-in", async () => {
    const verdict = await enforceExportGrounding(DOC, null, OWNER_ID);

    expect(verdict).toBe("missing_tailoring");
    expect(findExportGrant).not.toHaveBeenCalled();
  });

  it("returns not_found when the tailoring does not exist", async () => {
    findExportGrant.mockResolvedValue(null);

    const verdict = await enforceExportGrounding(DOC, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("not_found");
  });

  it("returns not_found (never a distinguishable ownership error) when the caller is NOT the owner — IDOR", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);

    const verdict = await enforceExportGrounding(DOC, TAILORING_ID, OTHER_ID);

    // Collapsed to the SAME outcome as "does not exist" so existence is never
    // leaked to a caller who doesn't own the row (IDOR, NFR-SEC-04).
    expect(verdict).toBe("not_found");
  });

  it("returns incomplete when the tailoring exists, is owned, but is not status=complete", async () => {
    findExportGrant.mockResolvedValue({ ...COMPLETE_GRANT, status: "pending" });

    const verdict = await enforceExportGrounding(DOC, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("incomplete");
  });

  it("returns ungrounded when a bullet text was never persisted (fabrication attempt)", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const fabricatedDoc: ExportDocument = { headline: "x", bullets: [FABRICATED_TEXT] };

    const verdict = await enforceExportGrounding(fabricatedDoc, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("ungrounded");
  });

  it("allows a persisted overclaim-risk bullet the caller re-included — membership, not an `included` filter (FR-BULLETS-02)", async () => {
    const OVERCLAIM_TEXT = "Scaled the platform to ten million daily users.";
    findExportGrant.mockResolvedValue({
      ...COMPLETE_GRANT,
      bullets: [{ text: GROUNDED_TEXT }, { text: OVERCLAIM_TEXT }],
    });
    const doc: ExportDocument = { headline: "x", bullets: [GROUNDED_TEXT, OVERCLAIM_TEXT] };

    const verdict = await enforceExportGrounding(doc, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("ok");
  });

  it("allows a fabricated summary/skills value alongside a fully-grounded bullet set — profile fields are NOT grounding-gated (deliberate scope boundary)", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const doc: ExportDocument = {
      headline: "x",
      bullets: [GROUNDED_TEXT],
      sections: {
        summary: ["Fabricated: personally invented the internet."],
        skills: ["Fabricated skill: telepathy"],
      },
    };

    const verdict = await enforceExportGrounding(doc, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("ok");
  });

  it("checks bullets inside sections.experience[].bullets too, not just the flat list", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const doc: ExportDocument = {
      headline: "x",
      bullets: [],
      sections: { experience: [{ title: "Engineer", bullets: [FABRICATED_TEXT] }] },
    };

    const verdict = await enforceExportGrounding(doc, TAILORING_ID, OWNER_ID);

    expect(verdict).toBe("ungrounded");
  });

  it("never logs bullet text or PII — only a stable coded line (NFR-OBS-01, NFR-SEC-01)", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const fabricatedDoc: ExportDocument = { headline: "x", bullets: [FABRICATED_TEXT] };

    await enforceExportGrounding(fabricatedDoc, TAILORING_ID, OWNER_ID);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const loggedArgs = warnSpy.mock.calls[0];
    for (const arg of loggedArgs) {
      expect(String(arg)).not.toContain(FABRICATED_TEXT);
    }
  });
});

describe("groundingErrorResponse", () => {
  it("returns null for ok (caller proceeds to render)", () => {
    expect(groundingErrorResponse("ok")).toBeNull();
  });

  it("maps missing_tailoring to a 400 with a calm coded body", async () => {
    const res = groundingErrorResponse("missing_tailoring");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({ error: "missing_tailoring" });
  });

  it("maps not_found to a 404 with a calm coded body", async () => {
    const res = groundingErrorResponse("not_found");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
    expect(await res!.json()).toEqual({ error: "not_found" });
  });

  it("maps incomplete to a 400 with a calm coded body", async () => {
    const res = groundingErrorResponse("incomplete");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({ error: "tailoring_incomplete" });
  });

  it("maps ungrounded to a 400 with a calm coded body", async () => {
    const res = groundingErrorResponse("ungrounded");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({ error: "ungrounded_export" });
  });
});
