// Route-level tests for POST /api/export/docx — the server-side paywall gate
// (FR-PAYWALL-01) fixed after a checker review found the route was reachable
// with zero entitlement check. Mirrors route.test.ts for /api/export/pdf.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
// server-side-export-gate (T5 #8, BC-HONESTY-02, NFR-SEC-04): `findExportGrant`
// mocks the DB read the membership gate uses. The real
// `enforceExportGrounding`/`isExportGrounded` logic runs unmocked — only the
// persisted-row lookup is faked.
const findExportGrant = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => subscriptionRepo,
  createTailoringRepo: () => ({ findExportGrant }),
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

const renderResumeDocx = vi.hoisted(() => vi.fn());
vi.mock("./resume-docx", () => ({ renderResumeDocx }));

import { POST } from "./route";

const DOC = { headline: "Tailored résumé", bullets: ["Led migration to TypeScript."] };

function post(body: unknown): Request {
  return new Request("http://localhost/api/export/docx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "u1",
  plan: "pro" as const,
  status: "active" as const,
  currentPeriodEnd: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  renderResumeDocx.mockResolvedValue(Buffer.from("docx-bytes"));
});

describe("POST /api/export/docx — server-side paywall (FR-PAYWALL-01)", () => {
  it("402s an anonymous caller without ever rendering", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("402s a signed-in free (non-paid) caller", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(null);

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("degrades an unreadable subscription lookup to not-paid, never a 500", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockRejectedValue(new Error("db down"));

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("degrades a broken session read to anonymous, never a 500", async () => {
    currentUserId.mockRejectedValue(new Error("session read failed"));

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("renders for a paid caller", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    // Bulletless doc (no tailoringId needed): isolates the PAYWALL assertion
    // from the mandatory server-side honesty gate below, which requires a
    // tailoringId for any bullet-bearing export. Grounding coverage for a
    // paid+tailoringId caller lives in the membership-gate describe block.
    const bulletlessDoc = { headline: "Tailored résumé", bullets: [] };

    const res = await POST(post({ document: bulletlessDoc }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(renderResumeDocx).toHaveBeenCalledWith(bulletlessDoc);
  });

  it("still 400s a malformed body before any entitlement lookup", async () => {
    const res = await POST(post({ document: { bullets: "not-an-array" } }));

    expect(res.status).toBe(400);
    expect(currentUserId).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Server-side membership honesty gate (server-side-export-gate, T5 #8,
// BC-HONESTY-02, NFR-SEC-04): MANDATORY for any bullet-bearing export — a
// missing/empty/non-string `tailoringId` is rejected (400 missing_tailoring)
// rather than falling back to shape-only validation. A bulletless document has
// nothing to ground, so it always passes without a `tailoringId`. Runs AFTER
// the paywall (402 still wins for a non-paid caller even with a tailoringId
// present). Mirrors /api/export/pdf/route.test.ts.
// ---------------------------------------------------------------------------
const TAILORING_ID = "t-1";
const GROUNDED_TEXT = "Led migration to TypeScript.";
const FABRICATED_TEXT = "Personally briefed the board of directors weekly.";

const COMPLETE_GRANT = {
  id: TAILORING_ID,
  userId: "u1",
  status: "complete",
  bullets: [{ text: GROUNDED_TEXT }],
};

describe("POST /api/export/docx — server-side membership gate (BC-HONESTY-02, NFR-SEC-04)", () => {
  beforeEach(() => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
  });

  it("tailoringId ABSENT on a bullet-bearing doc: 400 missing_tailoring, never touches the DB, never renders — the gate is mandatory", async () => {
    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_tailoring" });
    expect(findExportGrant).not.toHaveBeenCalled();
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("tailoringId absent but non-string (e.g. a number): 400 missing_tailoring on a bullet-bearing doc", async () => {
    const res = await POST(post({ document: DOC, tailoringId: 12345 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_tailoring" });
    expect(findExportGrant).not.toHaveBeenCalled();
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("bulletless document + tailoringId ABSENT: renders 200 — nothing to ground, never touches the DB", async () => {
    const bulletlessDoc = { headline: "x", bullets: [] };

    const res = await POST(post({ document: bulletlessDoc }));

    expect(res.status).toBe(200);
    expect(findExportGrant).not.toHaveBeenCalled();
    expect(renderResumeDocx).toHaveBeenCalledWith(bulletlessDoc);
  });

  it("allows a fabricated summary/skills value alongside a fully-grounded bullet set — profile fields are NOT grounding-gated", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const doc = {
      headline: "x",
      bullets: [GROUNDED_TEXT],
      sections: {
        summary: ["Fabricated: personally invented the internet."],
        skills: ["Fabricated skill: telepathy"],
      },
    };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(200);
    expect(renderResumeDocx).toHaveBeenCalledWith(doc);
  });

  it("tailoringId present + every bullet text persisted: renders (200, docx content-type)", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(renderResumeDocx).toHaveBeenCalledWith(doc);
  });

  it("tailoringId present + a fabricated bullet text: 400 ungrounded_export, never renders", async () => {
    findExportGrant.mockResolvedValue(COMPLETE_GRANT);
    const doc = { headline: "x", bullets: [FABRICATED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "ungrounded_export" });
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("tailoringId owned by ANOTHER user: 404 not_found (IDOR), never renders", async () => {
    findExportGrant.mockResolvedValue({ ...COMPLETE_GRANT, userId: "someone-else" });
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("tailoringId for a nonexistent tailoring: 404 not_found, never renders", async () => {
    findExportGrant.mockResolvedValue(null);
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(404);
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("tailoringId for a NOT-complete tailoring: 400 tailoring_incomplete, never renders", async () => {
    findExportGrant.mockResolvedValue({ ...COMPLETE_GRANT, status: "pending" });
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "tailoring_incomplete" });
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("allows a persisted overclaim-risk bullet re-included by the caller (FR-BULLETS-02) — membership, not an `included` filter", async () => {
    const OVERCLAIM_TEXT = "Scaled the platform to ten million daily users.";
    findExportGrant.mockResolvedValue({
      ...COMPLETE_GRANT,
      bullets: [{ text: GROUNDED_TEXT }, { text: OVERCLAIM_TEXT }],
    });
    const doc = { headline: "x", bullets: [GROUNDED_TEXT, OVERCLAIM_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(200);
    expect(renderResumeDocx).toHaveBeenCalledWith(doc);
  });

  it("a non-paid caller still gets 402 even with a tailoringId present — the paywall runs FIRST", async () => {
    subscriptionRepo.get.mockResolvedValue(null);
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(402);
    expect(findExportGrant).not.toHaveBeenCalled();
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("a grant-lookup throw is a calm coded 500, never renders, never leaks internals", async () => {
    findExportGrant.mockRejectedValue(new Error("db down"));
    const doc = { headline: "x", bullets: [GROUNDED_TEXT] };

    const res = await POST(post({ document: doc, tailoringId: TAILORING_ID }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "export_failed" });
    expect(renderResumeDocx).not.toHaveBeenCalled();
  });

  it("an empty-string tailoringId normalizes to absent: 400 missing_tailoring on a bullet-bearing doc", async () => {
    const res = await POST(post({ document: DOC, tailoringId: "" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_tailoring" });
    expect(findExportGrant).not.toHaveBeenCalled();
  });
});
