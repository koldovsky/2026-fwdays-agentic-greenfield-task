// Route-level tests for POST /api/auth/register (FR-AUTH-01, NFR-OBS-01).
// The db module is mocked: validation paths never reach it, and the infra
// failure path proves a thrown getDb (e.g. DATABASE_URL unset) surfaces as a
// calm machine-coded 500 — never a raw stack.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/db/pg", () => ({ getDb }));
vi.mock("@/shared/lib/db", () => ({
  createUserRepo: vi.fn(),
  createCredentialsRepo: vi.fn(),
}));

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
});
