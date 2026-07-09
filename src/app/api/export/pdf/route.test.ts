// Route-level tests for POST /api/export/pdf — the server-side paywall gate
// (FR-PAYWALL-01) fixed after a checker review found the route was reachable
// with zero entitlement check. Mirrors /api/tailor/generate/route.test.ts's
// mocking pattern: only the session + subscription lookup are mocked, so the
// real 400/402 logic runs unchanged.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({ createSubscriptionRepo: () => subscriptionRepo }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

const renderResumePdf = vi.hoisted(() => vi.fn());
vi.mock("./resume-pdf", () => ({ renderResumePdf }));

import { POST } from "./route";

const DOC = { headline: "Tailored résumé", bullets: ["Led migration to TypeScript."] };

function post(body: unknown): Request {
  return new Request("http://localhost/api/export/pdf", {
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
  renderResumePdf.mockResolvedValue(Buffer.from("pdf-bytes"));
});

describe("POST /api/export/pdf — server-side paywall (FR-PAYWALL-01)", () => {
  it("402s an anonymous caller without ever rendering", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumePdf).not.toHaveBeenCalled();
  });

  it("402s a signed-in free (non-paid) caller", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(null);

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumePdf).not.toHaveBeenCalled();
  });

  it("degrades an unreadable subscription lookup to not-paid, never a 500", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockRejectedValue(new Error("db down"));

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumePdf).not.toHaveBeenCalled();
  });

  it("degrades a broken session read to anonymous, never a 500", async () => {
    currentUserId.mockRejectedValue(new Error("session read failed"));

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(402);
    expect(renderResumePdf).not.toHaveBeenCalled();
  });

  it("renders for a paid caller", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);

    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(renderResumePdf).toHaveBeenCalledWith(DOC);
  });

  it("still 400s a malformed body before any entitlement lookup", async () => {
    const res = await POST(post({ document: { bullets: "not-an-array" } }));

    expect(res.status).toBe(400);
    expect(currentUserId).not.toHaveBeenCalled();
  });
});
