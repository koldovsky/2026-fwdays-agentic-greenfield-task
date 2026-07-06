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

  // Task 4.4 — NFR-GDPR-01/02, NFR-SEC-01, NFR-OBS-01: when one or more profiles
  // fail decryption the route must return 200 (not 500) with a body that carries
  // decryptionFailed:true for the failing profile. The response must contain no key
  // material and no internal error message — only the boolean flag reaches the client.
  it("returns 200 (not 500) when one profile fails decryption (NFR-GDPR-01/02)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p1",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
        {
          id: "p2",
          createdAt: "2026-07-02T00:00:00.000Z",
          profile: { skills: ["react"], sentences: ["Built a thing"] },
          rawText: "Ada — React engineer",
        },
      ],
      tailorings: [],
    });

    const res = await GET();

    expect(res.status).toBe(200);
  });

  it("returns decryptionFailed:true in the body for the failing profile (NFR-GDPR-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p-fail",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
      ],
      tailorings: [],
    });

    const res = await GET();
    const body = await res.json();

    expect(body.cvProfiles).toHaveLength(1);
    expect(body.cvProfiles[0].decryptionFailed).toBe(true);
    expect(body.cvProfiles[0].rawText).toBeNull();
  });

  it("body contains no key material when a profile fails decryption (NFR-SEC-01)", async () => {
    const KEY_MATERIAL = "CV_ENCRYPTION_KEY=sup3rS3cr3t";
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p-fail",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
      ],
      tailorings: [],
    });

    const res = await GET();
    const rawBody = await res.text();

    // No key fragments must appear anywhere in the serialized response.
    expect(rawBody).not.toContain(KEY_MATERIAL);
    expect(rawBody).not.toContain("sup3rS3cr3t");
    // The internal error message must not be forwarded to the client.
    expect(rawBody).not.toContain("CV_ENCRYPTION_KEY");
  });

  it("still includes the successfully-decrypted profiles alongside the failed one (NFR-GDPR-02)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p-fail",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
        {
          id: "p-ok",
          createdAt: "2026-07-02T00:00:00.000Z",
          profile: { skills: ["go"], sentences: ["Shipped a feature"] },
          rawText: "Ada — Go engineer",
        },
      ],
      tailorings: [],
    });

    const res = await GET();
    const body = await res.json();

    expect(body.cvProfiles).toHaveLength(2);
    const okProfile = body.cvProfiles.find((p: { id: string }) => p.id === "p-ok");
    expect(okProfile.rawText).toBe("Ada — Go engineer");
    expect(okProfile.decryptionFailed).toBeUndefined();
  });
});
