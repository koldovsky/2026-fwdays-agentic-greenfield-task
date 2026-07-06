// Route-level tests for POST /api/export/cover-letter — the server-side paywall
// gate (FR-PAYWALL-01), calm-failure contract (NFR-OBS-01), grounded-letter path
// (T5 §3.1/3.3, FR-COVERLETTER-01/02, BC-HONESTY-01/02), and regression for the
// no-letter (deterministic-only) path.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({ createSubscriptionRepo: () => subscriptionRepo }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

const renderCoverLetterPdf = vi.hoisted(() => vi.fn());
vi.mock("./cover-letter-pdf", () => ({ renderCoverLetterPdf }));

// Mock both the LLM provider factory and the grounded-letter generator so the
// route tests are deterministic without ANTHROPIC_API_KEY (TC-PURE-01,
// honesty-eval pattern: fake provider, deterministic).
const mockResolveLlmProvider = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/llm")>("@/shared/lib/llm");
  return { ...actual, resolveLlmProvider: mockResolveLlmProvider };
});

const mockGenerateGroundedCoverLetter = vi.hoisted(() => vi.fn());
vi.mock("@/features/export-cover-letter", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/export-cover-letter")>(
      "@/features/export-cover-letter",
    );
  return { ...actual, generateGroundedCoverLetter: mockGenerateGroundedCoverLetter };
});

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

const FAKE_LLM_PROVIDER = { complete: vi.fn(), stream: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  renderCoverLetterPdf.mockResolvedValue(Buffer.from("pdf-bytes"));
  mockResolveLlmProvider.mockReturnValue(FAKE_LLM_PROVIDER);
  // Default: grounded generator returns null (deterministic fallback).
  mockGenerateGroundedCoverLetter.mockResolvedValue(null);
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

// --- Grounded-letter path (T5 §3.1/3.3) ------------------------------------
// When the body carries a `letter` context with at least one CV sentence, the
// route attempts the two-pass grounded letter. The render input is EXACTLY ONE
// of: (a) the verified LLM document, or (b) the client's deterministic fallback.
// Unverified prose must NEVER reach renderCoverLetterPdf (BC-HONESTY-01/02).

const LETTER_CONTEXT = {
  cvSentences: ["Побудував платіжну систему на React за два квартали."],
  requirements: [{ id: "r1", text: "React experience", importance: "must-have", keywords: ["react"] }],
  framing: {
    greeting: "Доброго дня,",
    closing: "Буду радий обговорити деталі. З повагою.",
    headline: "Супровідний лист",
  },
};

describe("POST /api/export/cover-letter — grounded path (T5 §3.1/3.3, FR-COVERLETTER-01/02, BC-HONESTY-01/02)", () => {
  beforeEach(() => {
    // Paid by default for all grounded-path tests.
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
  });

  it("uses the VERIFIED LLM document when generateGroundedCoverLetter returns verified paragraphs", async () => {
    // The grounded generator returns verified paragraphs; the rendered doc must
    // include these paragraphs (wrapped in framing), not the fallback DOC.
    const VERIFIED_PARAGRAPHS = [
      "Я збудував платіжну систему на React.",
      "Координував трьох бекенд-розробників.",
    ];
    mockGenerateGroundedCoverLetter.mockResolvedValueOnce({ paragraphs: VERIFIED_PARAGRAPHS });

    const res = await POST(
      post({
        document: DOC,
        letter: LETTER_CONTEXT,
      }),
    );

    expect(res.status).toBe(200);
    expect(renderCoverLetterPdf).toHaveBeenCalledTimes(1);

    // The rendered document must carry the VERIFIED paragraphs wrapped in
    // the client's framing (greeting + paragraphs + closing).
    const renderedDoc = renderCoverLetterPdf.mock.calls[0][0] as {
      coverLetter: { paragraphs: string[] };
    };
    const rendered = renderedDoc.coverLetter.paragraphs;
    // Greeting is first, verified paragraphs in the middle, closing last.
    expect(rendered[0]).toBe(LETTER_CONTEXT.framing.greeting);
    expect(rendered).toContain(VERIFIED_PARAGRAPHS[0]);
    expect(rendered).toContain(VERIFIED_PARAGRAPHS[1]);
    expect(rendered[rendered.length - 1]).toBe(LETTER_CONTEXT.framing.closing);

    // CRITICAL: must NOT render the original DOC's paragraphs (the fallback).
    for (const p of DOC.coverLetter.paragraphs) {
      expect(rendered).not.toContain(p);
    }
  });

  it("falls back to the client's deterministic document when generateGroundedCoverLetter returns null (BC-HONESTY-01)", async () => {
    mockGenerateGroundedCoverLetter.mockResolvedValueOnce(null);

    const res = await POST(
      post({
        document: DOC,
        letter: LETTER_CONTEXT,
      }),
    );

    expect(res.status).toBe(200);
    expect(renderCoverLetterPdf).toHaveBeenCalledWith(DOC);
  });

  it("falls back to the deterministic document when resolveLlmProvider throws (NFR-OBS-01, BC-HONESTY-01)", async () => {
    // Provider config failure: the route should fall back, never 500.
    mockResolveLlmProvider.mockImplementationOnce(() => {
      throw new Error("missing ANTHROPIC_API_KEY");
    });

    const res = await POST(
      post({
        document: DOC,
        letter: LETTER_CONTEXT,
      }),
    );

    // Falls back — the deterministic document is rendered instead.
    expect(res.status).toBe(200);
    expect(renderCoverLetterPdf).toHaveBeenCalledWith(DOC);
  });

  it("renders the fallback document when the letter context is invalid (empty cvSentences)", async () => {
    // A letter context with no cvSentences is treated as absent — no LLM attempt.
    const res = await POST(
      post({
        document: DOC,
        letter: { ...LETTER_CONTEXT, cvSentences: [] },
      }),
    );

    expect(res.status).toBe(200);
    // generateGroundedCoverLetter must NOT have been called.
    expect(mockGenerateGroundedCoverLetter).not.toHaveBeenCalled();
    expect(renderCoverLetterPdf).toHaveBeenCalledWith(DOC);
  });
});

describe("POST /api/export/cover-letter — no-letter path regression (NFR-OBS-01, FR-PAYWALL-01)", () => {
  beforeEach(() => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
  });

  it("renders the deterministic fallback exactly when no letter context is supplied (pre-T5 behavior)", async () => {
    const res = await POST(post({ document: DOC }));

    expect(res.status).toBe(200);
    // No LLM attempt without letter context.
    expect(mockGenerateGroundedCoverLetter).not.toHaveBeenCalled();
    expect(renderCoverLetterPdf).toHaveBeenCalledWith(DOC);
  });

  it("non-paid caller with a letter context still gets 402 before any LLM attempt (FR-PAYWALL-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    subscriptionRepo.get.mockResolvedValue(null); // free user

    const res = await POST(
      post({
        document: DOC,
        letter: LETTER_CONTEXT,
      }),
    );

    expect(res.status).toBe(402);
    expect(mockGenerateGroundedCoverLetter).not.toHaveBeenCalled();
    expect(renderCoverLetterPdf).not.toHaveBeenCalled();
  });

  it("400s a body without a valid cover-letter block even with letter context present", async () => {
    const res = await POST(
      post({
        document: { bullets: [] }, // missing coverLetter block
        letter: LETTER_CONTEXT,
      }),
    );
    expect(res.status).toBe(400);
    expect(currentUserId).not.toHaveBeenCalled();
  });
});
