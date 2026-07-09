// Route-level tests for DELETE /api/account — GDPR hard delete (NFR-GDPR-02,
// FR-CV-05). Focus: a downstream throw (unconfigured env, DB/FK error, key
// failure) must become a calm coded 500, never an uncaught raw 500 that leaks a
// stack or schema (NFR-OBS-01, no information disclosure). Only the session and
// the service call are mocked, so the route's own gating + envelope run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const deleteAccount = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/account", () => ({ deleteAccount }));

vi.mock("@/shared/lib/crypto", () => ({ getCvEncryptionKey: () => Buffer.alloc(32) }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("@/shared/lib/db", () => ({
  createUserRepo: () => ({}),
  createCvProfileRepo: () => ({}),
  createTailoringRepo: () => ({}),
}));

import { DELETE } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  // Silence the intentional server-side error log in the failure test.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("DELETE /api/account (NFR-GDPR-02)", () => {
  it("401s an anonymous caller without touching the service", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes and clears both session cookies on success", async () => {
    currentUserId.mockResolvedValue("u1");
    deleteAccount.mockResolvedValue(undefined);

    const res = await DELETE();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: true });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("authjs.session-token=");
    expect(setCookie).toContain("__Secure-authjs.session-token=");
  });

  it("returns a calm coded 500 (never an uncaught throw) when the service fails", async () => {
    currentUserId.mockResolvedValue("u1");
    deleteAccount.mockRejectedValue(new Error('relation "users" violates fk constraint xyz'));

    // Must resolve, not reject — the route swallows the throw.
    const res = await DELETE();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "deletion_failed" });
    // No stack, message, or schema detail leaks to the caller (info disclosure).
    expect(JSON.stringify(body)).not.toContain("fk constraint");
  });
});
