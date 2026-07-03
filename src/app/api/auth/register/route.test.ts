// Route-level tests for POST /api/auth/register (FR-AUTH-01, NFR-OBS-01, and
// the add-security-hardening per-IP throttle, NFR-SEC-04). The db and auth
// service modules are mocked: validation paths never reach them, and the infra
// failure path proves a thrown getDb (e.g. DATABASE_URL unset) surfaces as a
// calm machine-coded 500 — never a raw stack. The per-IP limiter runs for real
// against its module-level in-memory store, so tests that exercise it use
// their own dedicated IPs.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.hoisted(() => vi.fn());
const registerWithPassword = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/db/pg", () => ({ getDb }));
vi.mock("@/shared/lib/db", () => ({
  createUserRepo: vi.fn(),
  createCredentialsRepo: vi.fn(),
}));
vi.mock("@/shared/lib/auth", () => ({ registerWithPassword }));

import { POST } from "./route";

function request(body: unknown, ip = "203.0.113.50"): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("rejects a non-JSON body with 400 invalid_body", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
  });

  it("rejects a malformed email with 400 invalid_email", async () => {
    const response = await POST(request({ email: "nope", password: "long-enough" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects a short password with 400 weak_password", async () => {
    const response = await POST(request({ email: "a@b.co", password: "short" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "weak_password" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns a calm 500 server_error when infrastructure throws (NFR-OBS-01)", async () => {
    getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not set");
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request({ email: "a@b.co", password: "long-enough" }));

    expect(response.status).toBe(500);
    // Machine code only — no stack, no infra detail leaks to the client.
    expect(await response.json()).toEqual({ error: "server_error" });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("throttles account creation per IP with a calm machine-coded 429 (NFR-SEC-04)", async () => {
    getDb.mockReturnValue({});
    registerWithPassword.mockImplementation(async (_deps, input: { email: string }) => ({
      ok: true,
      value: { id: "u1", email: input.email, name: null },
    }));

    // The window allows 5 created accounts per IP; all five succeed.
    for (let i = 0; i < 5; i += 1) {
      const created = await POST(
        request({ email: `bot${i}@example.com`, password: "long-enough" }, "198.51.100.20"),
      );
      expect(created.status).toBe(201);
    }

    const blocked = await POST(
      request({ email: "bot9@example.com", password: "long-enough" }, "198.51.100.20"),
    );

    // Calm machine code, no account detail — no enumeration signal.
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "rate_limited" });
    // A throttled request never reaches the registration service.
    expect(registerWithPassword).toHaveBeenCalledTimes(5);
  });

  it("does not charge the per-IP window for a failed registration", async () => {
    getDb.mockReturnValue({});
    registerWithPassword.mockResolvedValue({ ok: false, error: "email_taken" });

    // More failed attempts than the window allows — none is charged, so the
    // response stays the uniform 409, never a 429 (rejected ≠ created).
    for (let i = 0; i < 7; i += 1) {
      const response = await POST(
        request({ email: "taken@example.com", password: "long-enough" }, "198.51.100.21"),
      );
      expect(response.status).toBe(409);
    }
  });
});
