// Route-level tests for GET /api/account/export — GDPR data export (NFR-GDPR-01).
// The confirmed 500 came from getCvEncryptionKey()/getDb() throwing (unset env)
// or an assembly error propagating uncaught. All of those must degrade to a calm
// coded 500, never an uncaught raw 500 leaking the missing-key detail or a stack
// (NFR-OBS-01, no information disclosure). Session + service are mocked; the
// route's gating + envelope run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const exportAccountData = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/account", () => ({ exportAccountData }));

const getCvEncryptionKey = vi.hoisted(() => vi.fn(() => Buffer.alloc(32)));
vi.mock("@/shared/lib/crypto", () => ({ getCvEncryptionKey }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("@/shared/lib/db", () => ({
  createUserRepo: () => ({}),
  createCvProfileRepo: () => ({}),
  createTailoringRepo: () => ({}),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  getCvEncryptionKey.mockReturnValue(Buffer.alloc(32));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/account/export (NFR-GDPR-01)", () => {
  it("401s an anonymous caller without assembling anything", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(exportAccountData).not.toHaveBeenCalled();
  });

  it("streams the export as a JSON attachment on success", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({ exportedAt: "2026-07-04T00:00:00.000Z", user: { id: "u1" }, cvProfiles: [], tailorings: [] });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain('filename="vouch-export.json"');
  });

  it("404s when the user row is gone", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it("returns a calm coded 500 when the encryption key is unset (the confirmed root cause)", async () => {
    currentUserId.mockResolvedValue("u1");
    getCvEncryptionKey.mockImplementation(() => {
      throw new Error("CV_ENCRYPTION_KEY is not set");
    });

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "export_failed" });
    // The missing-key detail never reaches the caller.
    expect(JSON.stringify(body)).not.toContain("CV_ENCRYPTION_KEY");
    expect(exportAccountData).not.toHaveBeenCalled();
  });

  it("returns a calm coded 500 (never an uncaught throw) when assembly fails", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockRejectedValue(new Error("db connection refused"));

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "export_failed" });
  });
});
