// Route-level tests for POST /api/export/cover-letter — the server-side paywall
// gate (FR-PAYWALL-01) and calm-failure contract (NFR-OBS-01), mirroring the
// /api/export/pdf route tests. Only the session + subscription lookup and the
// renderer are mocked, so the real 400/402 logic runs unchanged.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({ createSubscriptionRepo: () => subscriptionRepo }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

const renderCoverLetterPdf = vi.hoisted(() => vi.fn());
vi.mock("./cover-letter-pdf", () => ({ renderCoverLetterPdf }));

import { POST } from "./route";

const DOC = {
  headline: "Супровідний лист",
  bullets: [],
  coverLetter: { paragraphs: ["Доброго дня!", "Маю досвід з React."] },
};

function post(body: unknown): Request {
  return new Request("http://localhost/api/export/cover-letter", {
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
  renderCoverLetterPdf.mockResolvedValue(Buffer.from("pdf-bytes"));
});

describe("POST /api/export/cover-letter — server-side paywall (FR-PAYWALL-01)", () => {
  it("402s an anonymous caller without ever rendering", async () => {
    currentUserId.mockResolvedValue(null);
    const res = await POST(post({ document: DOC }));
    expect(res.status).toBe(402);
    expect(renderCoverLetterPdf).not.toHaveBeenCalled();
  });

  it("402s a signed-in free (non-paid) caller regardless of body", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(null);
    const res = await POST(post({ document: DOC }));
    expect(res.status).toBe(402);
    expect(renderCoverLetterPdf).not.toHaveBeenCalled();
  });

  it("degrades an unreadable subscription lookup to not-paid, never a 500", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockRejectedValue(new Error("db down"));
    const res = await POST(post({ document: DOC }));
    expect(res.status).toBe(402);
  });

  it("renders for a paid caller", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    const res = await POST(post({ document: DOC }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(renderCoverLetterPdf).toHaveBeenCalledWith(DOC);
  });

  it("400s a body without a cover-letter block before any entitlement lookup", async () => {
    const res = await POST(post({ document: { bullets: [] } }));
    expect(res.status).toBe(400);
    expect(currentUserId).not.toHaveBeenCalled();
  });

  it("returns a calm coded 500 when rendering throws (NFR-OBS-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    renderCoverLetterPdf.mockRejectedValue(new Error("boom"));
    const res = await POST(post({ document: DOC }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "export_failed" });
  });
});
