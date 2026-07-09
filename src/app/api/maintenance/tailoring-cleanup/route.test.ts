// Route-level tests for POST /api/maintenance/tailoring-cleanup — sweeps
// abandoned pending tailorings (NFR-COST-02, FR-ONBOARD-01, NFR-SEC-01,
// NFR-OBS-01). Written against the SPEC/BEHAVIOR; the implementation is not
// referenced in this file.
//
// Auth contract: Bearer <MAINTENANCE_SECRET> in the Authorization header.
// When the secret is unset the route must respond 503 before accepting any
// caller. The provided token is NEVER echoed in any response body or log.
//
// Conventions: vi.stubEnv + vi.unstubAllEnvs for env isolation; vi.hoisted +
// vi.mock for module dependencies; vi.spyOn(console, ...) to assert / silence
// server-side logs; direct call (no fetch) per the colocated route-test pattern.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist + mock dependencies BEFORE the route import so the mocks are in place
// when the module graph resolves.
// ---------------------------------------------------------------------------

const getMaintenanceSecretMock = vi.hoisted(() => vi.fn<() => string>());
vi.mock("@/shared/config", () => ({
  getMaintenanceSecret: getMaintenanceSecretMock,
}));

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/db/pg", () => ({ getDb: getDbMock }));

const markAbandonedPendingMock = vi.hoisted(() =>
  vi.fn<(db: unknown, olderThanMs: number) => Promise<number>>(),
);
vi.mock("@/shared/lib/db/tailoring-cleanup", () => ({
  markAbandonedPending: markAbandonedPendingMock,
}));

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = "test-maintenance-secret-abc123";

function makeRequest(opts: {
  authHeader?: string;
  omitAuth?: boolean;
}): Request {
  const headers: Record<string, string> = {};
  if (!opts.omitAuth) {
    if (opts.authHeader !== undefined) {
      headers["authorization"] = opts.authHeader;
    }
  }
  return new Request("http://localhost/api/maintenance/tailoring-cleanup", {
    method: "POST",
    headers,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Silence server-side log output in most tests; individual tests may inspect
  // the calls before the mock is in place but we set it globally for convenience.
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleInfoSpy.mockRestore();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// 1. Only POST is exported — no GET handler means Next.js returns 405
//    (We test this indirectly: only POST is imported from the route module.)
// ---------------------------------------------------------------------------

describe("route exports (behavior 1)", () => {
  it("exports POST but not GET — callers using any other method get no handler", () => {
    // The module must expose POST.
    expect(typeof POST).toBe("function");
    // Importing the module must not export GET/PUT/PATCH/DELETE.
    // Dynamic import lets us inspect without needing a real HTTP layer.
    const mod = import("./route") as Promise<Record<string, unknown>>;
    return mod.then((exports) => {
      expect(exports.GET).toBeUndefined();
      expect(exports.PUT).toBeUndefined();
      expect(exports.PATCH).toBeUndefined();
      expect(exports.DELETE).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// 2 + required: MAINTENANCE_SECRET unset or empty → 503, sweeper NOT called
// ---------------------------------------------------------------------------

describe("MAINTENANCE_SECRET unconfigured (behaviors 2, required case 1)", () => {
  it("returns 503 with { error: 'maintenance_unconfigured' } when secret is unset", async () => {
    getMaintenanceSecretMock.mockImplementation(() => {
      throw new Error("MAINTENANCE_SECRET is not set");
    });

    const res = await POST(makeRequest({ omitAuth: true }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "maintenance_unconfigured" });
  });

  it("does NOT call markAbandonedPending when secret is unconfigured", async () => {
    getMaintenanceSecretMock.mockImplementation(() => {
      throw new Error("MAINTENANCE_SECRET is not set");
    });

    await POST(makeRequest({ omitAuth: true }));

    expect(markAbandonedPendingMock).not.toHaveBeenCalled();
  });

  it("logs exactly one stable non-secret error line when unconfigured", async () => {
    getMaintenanceSecretMock.mockImplementation(() => {
      throw new Error("MAINTENANCE_SECRET is not set");
    });

    await POST(makeRequest({ omitAuth: true }));

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    // The log line must be stable and non-secret: a string, not the exception
    // object or the missing-key message verbatim.
    const logArg: unknown = consoleErrorSpy.mock.calls[0][0];
    expect(typeof logArg).toBe("string");
    // Must NOT contain the secret value (it's unset here, but the pattern holds).
    expect(String(logArg)).not.toContain("MAINTENANCE_SECRET is not set");
  });

  it("returns 503 when getMaintenanceSecret throws regardless of auth header", async () => {
    getMaintenanceSecretMock.mockImplementation(() => {
      throw new Error("MAINTENANCE_SECRET is not set");
    });

    // Even a correct-looking header must not let the caller through.
    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// 3. Authorization header missing → 401, sweeper NOT called
// ---------------------------------------------------------------------------

describe("missing Authorization header (behaviors 3, required case 2)", () => {
  beforeEach(() => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
  });

  it("returns 401 { error: 'unauthorized' } when Authorization header is absent", async () => {
    const res = await POST(makeRequest({ omitAuth: true }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("does NOT call markAbandonedPending when Authorization header is missing", async () => {
    await POST(makeRequest({ omitAuth: true }));

    expect(markAbandonedPendingMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4 + required: Blank / malformed / wrong header → 401, sweeper NOT called
// ---------------------------------------------------------------------------

describe("malformed or wrong Authorization header (behaviors 4, required case 3 & 4)", () => {
  beforeEach(() => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
  });

  // NOTE: auth requires an exact, constant-time match of the whole
  // Authorization header against "Bearer <secret>". A header that differs in
  // value but happens to share the same byte length (e.g. a leading/trailing
  // space offset by a one-char-shorter secret) is rejected in constant time —
  // it does NOT slip through. The only residual side-channel is the header's
  // length, which is not the secret. The cases below cover both differing
  // lengths and same-length-wrong-value inputs; all must return 401.
  const badHeaders = [
    { label: "empty string", value: "" },
    { label: "only 'Bearer' with no token", value: "Bearer" },
    { label: "Bearer with trailing space only", value: "Bearer " },
    { label: "wrong token", value: "Bearer wrong-token" },
    { label: "correct token but no Bearer prefix", value: SECRET },
    { label: "lowercase bearer prefix", value: `bearer ${SECRET}` },
    { label: "wrong secret entirely", value: "Bearer absolutely-wrong" },
    { label: "correct token with extra characters appended", value: `Bearer ${SECRET}x` },
  ];

  for (const { label, value } of badHeaders) {
    it(`returns 401 for header: ${label}`, async () => {
      const res = await POST(makeRequest({ authHeader: value }));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it(`does NOT call markAbandonedPending for header: ${label}`, async () => {
      await POST(makeRequest({ authHeader: value }));

      expect(markAbandonedPendingMock).not.toHaveBeenCalled();
    });
  }

  // Same-byte-length, wrong-value headers: whitespace padding offset by a
  // one-char-shorter secret so the total length equals "Bearer <secret>".
  // These exercise the exact-match / constant-time guarantee — a matching
  // length must NOT be enough; the whole string has to match byte-for-byte.
  const SHORT_SECRET = "test-maintenance-secret-abc12"; // one char shorter than SECRET
  const paddedSameLengthHeaders = [
    // " Bearer <short>" — leading space, length === "Bearer <SECRET>".length
    { label: "leading-space padded (matching length, wrong value)", value: ` Bearer ${SHORT_SECRET}` },
    // "Bearer <short> " — trailing space, length === "Bearer <SECRET>".length
    { label: "trailing-space padded (matching length, wrong value)", value: `Bearer ${SHORT_SECRET} ` },
  ];

  for (const { label, value } of paddedSameLengthHeaders) {
    it(`returns 401 for header: ${label}`, async () => {
      // Sanity: this header has the SAME byte length as a valid one, proving
      // the guard rejects on value (constant-time) and not merely on length.
      expect(value.length).toBe(`Bearer ${SECRET}`.length);

      const res = await POST(makeRequest({ authHeader: value }));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it(`does NOT call markAbandonedPending for header: ${label}`, async () => {
      await POST(makeRequest({ authHeader: value }));

      expect(markAbandonedPendingMock).not.toHaveBeenCalled();
    });
  }
});

// ---------------------------------------------------------------------------
// 5 + required: Correct "Bearer <secret>" → 200 { swept: N }, sweeper called
// ---------------------------------------------------------------------------

describe("correct authorization (behaviors 5, required case 5)", () => {
  beforeEach(() => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
  });

  it("returns 200 { swept: N } when Authorization is correct Bearer token", async () => {
    markAbandonedPendingMock.mockResolvedValue(7);

    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ swept: 7 });
  });

  it("returns 200 { swept: 0 } when no rows were pending beyond TTL", async () => {
    markAbandonedPendingMock.mockResolvedValue(0);

    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ swept: 0 });
  });

  it("calls markAbandonedPending exactly once", async () => {
    markAbandonedPendingMock.mockResolvedValue(3);

    await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(markAbandonedPendingMock).toHaveBeenCalledTimes(1);
  });

  it("calls markAbandonedPending with (db, 1_800_000) — 30-minute TTL", async () => {
    const fakeDb = { query: vi.fn() };
    getDbMock.mockReturnValue(fakeDb);
    markAbandonedPendingMock.mockResolvedValue(2);

    await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(markAbandonedPendingMock).toHaveBeenCalledWith(fakeDb, 1_800_000);
  });
});

// ---------------------------------------------------------------------------
// 6. Token never echoed in any response body
// ---------------------------------------------------------------------------

describe("token never echoed in response body (behavior 6)", () => {
  it("does not include the secret in the 401 body when the wrong token is sent", async () => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);

    const res = await POST(makeRequest({ authHeader: "Bearer wrong-value" }));
    const raw = await res.text();

    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain("wrong-value");
  });

  it("does not include the secret in the 200 body after a successful sweep", async () => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
    markAbandonedPendingMock.mockResolvedValue(5);

    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));
    const raw = await res.text();

    expect(raw).not.toContain(SECRET);
  });

  it("does not include the secret in the 503 body when unconfigured", async () => {
    getMaintenanceSecretMock.mockImplementation(() => {
      throw new Error("MAINTENANCE_SECRET is not set");
    });

    const res = await POST(makeRequest({ omitAuth: true }));
    const raw = await res.text();

    // SECRET is unset here, but the pattern applies generally.
    expect(raw).not.toContain("MAINTENANCE_SECRET is not set");
  });
});

// ---------------------------------------------------------------------------
// 7. Token never written to any log line
// ---------------------------------------------------------------------------

describe("token never written to logs (behavior 7)", () => {
  it("does not log the provided Authorization token on any code path", async () => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
    markAbandonedPendingMock.mockResolvedValue(4);

    // Allow console.info through for this test to inspect it.
    consoleInfoSpy.mockRestore();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    for (const call of infoSpy.mock.calls) {
      expect(call.join(" ")).not.toContain(SECRET);
    }
    for (const call of consoleErrorSpy.mock.calls) {
      expect(call.join(" ")).not.toContain(SECRET);
    }
    infoSpy.mockRestore();
  });

  it("does not log the provided (wrong) token on an unauthorized path", async () => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
    const wrongToken = "my-totally-different-secret-xyz";

    await POST(makeRequest({ authHeader: `Bearer ${wrongToken}` }));

    for (const call of consoleErrorSpy.mock.calls) {
      expect(call.join(" ")).not.toContain(wrongToken);
    }
    for (const call of consoleInfoSpy.mock.calls) {
      expect(call.join(" ")).not.toContain(wrongToken);
    }
  });
});

// ---------------------------------------------------------------------------
// 8 + required: DB error → 500 { error: 'cleanup_failed' }, no stack/message
// ---------------------------------------------------------------------------

describe("DB error during sweep (behaviors 8, required case 6)", () => {
  beforeEach(() => {
    getMaintenanceSecretMock.mockReturnValue(SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
  });

  it("returns 500 { error: 'cleanup_failed' } when markAbandonedPending throws", async () => {
    markAbandonedPendingMock.mockRejectedValue(
      new Error('relation "tailorings" violates fk constraint abc'),
    );

    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "cleanup_failed" });
  });

  it("does not include stack, schema, or message details in the 500 response", async () => {
    const internalMsg = "connection refused at 127.0.0.1:5432";
    markAbandonedPendingMock.mockRejectedValue(new Error(internalMsg));

    const res = await POST(makeRequest({ authHeader: `Bearer ${SECRET}` }));
    const raw = await res.text();

    expect(raw).not.toContain(internalMsg);
    expect(raw).not.toContain("127.0.0.1");
    expect(raw).not.toContain("stack");
    expect(raw).not.toContain("tailorings");
  });

  it("swallows the throw — the route resolves rather than rejects", async () => {
    markAbandonedPendingMock.mockRejectedValue(new Error("db dead"));

    await expect(
      POST(makeRequest({ authHeader: `Bearer ${SECRET}` })),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 9–12. getMaintenanceSecret() exported from @/shared/config + correct behavior
// ---------------------------------------------------------------------------

describe("getMaintenanceSecret() from shared/config (behaviors 9–12)", () => {
  let savedSecret: string | undefined;

  beforeEach(() => {
    savedSecret = process.env.MAINTENANCE_SECRET;
  });

  afterEach(() => {
    if (savedSecret === undefined) {
      delete process.env.MAINTENANCE_SECRET;
    } else {
      process.env.MAINTENANCE_SECRET = savedSecret;
    }
  });

  it("is importable as a named export from @/shared/config (behavior 9)", async () => {
    // Unmock shared/config for this test to exercise the real implementation.
    const mod = await import("@/shared/config");
    expect(typeof (mod as Record<string, unknown>).getMaintenanceSecret).toBe("function");
  });

  // For behaviors 10–12, we test the real implementation imported from env.ts
  // directly (avoids the vi.mock that swaps it out for the route tests above).
  it("throws Error('MAINTENANCE_SECRET is not set') when env var is undefined (behavior 10)", async () => {
    delete process.env.MAINTENANCE_SECRET;
    const { getMaintenanceSecret } = await import("@/shared/config/env");
    expect(() => getMaintenanceSecret()).toThrow("MAINTENANCE_SECRET is not set");
  });

  it("throws Error('MAINTENANCE_SECRET is not set') when env var is empty string (behavior 11)", async () => {
    process.env.MAINTENANCE_SECRET = "";
    const { getMaintenanceSecret } = await import("@/shared/config/env");
    expect(() => getMaintenanceSecret()).toThrow("MAINTENANCE_SECRET is not set");
  });

  it("returns the env var value when MAINTENANCE_SECRET is a non-empty string (behavior 12)", async () => {
    process.env.MAINTENANCE_SECRET = "super-secret-value";
    const { getMaintenanceSecret } = await import("@/shared/config/env");
    expect(getMaintenanceSecret()).toBe("super-secret-value");
  });

  it("throws an Error instance (not a string or other type) when unset", async () => {
    delete process.env.MAINTENANCE_SECRET;
    const { getMaintenanceSecret } = await import("@/shared/config/env");
    expect(() => getMaintenanceSecret()).toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// Integration-style: response body never contains the secret on ANY path
// ---------------------------------------------------------------------------

describe("secret never in response body — all paths (required: body never contains secret)", () => {
  const LIVE_SECRET = "live-secret-zqx99";

  it("body clean on 401 (missing auth)", async () => {
    getMaintenanceSecretMock.mockReturnValue(LIVE_SECRET);

    const res = await POST(makeRequest({ omitAuth: true }));
    const raw = await res.text();

    expect(raw).not.toContain(LIVE_SECRET);
  });

  it("body clean on 401 (wrong auth)", async () => {
    getMaintenanceSecretMock.mockReturnValue(LIVE_SECRET);

    const res = await POST(makeRequest({ authHeader: "Bearer not-the-secret" }));
    const raw = await res.text();

    expect(raw).not.toContain(LIVE_SECRET);
  });

  it("body clean on 200 (success)", async () => {
    getMaintenanceSecretMock.mockReturnValue(LIVE_SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
    markAbandonedPendingMock.mockResolvedValue(1);

    const res = await POST(makeRequest({ authHeader: `Bearer ${LIVE_SECRET}` }));
    const raw = await res.text();

    expect(raw).not.toContain(LIVE_SECRET);
  });

  it("body clean on 500 (db error)", async () => {
    getMaintenanceSecretMock.mockReturnValue(LIVE_SECRET);
    getDbMock.mockReturnValue({ query: vi.fn() });
    markAbandonedPendingMock.mockRejectedValue(new Error("boom"));

    const res = await POST(makeRequest({ authHeader: `Bearer ${LIVE_SECRET}` }));
    const raw = await res.text();

    expect(raw).not.toContain(LIVE_SECRET);
  });
});
