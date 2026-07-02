import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar, redirect } = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { clearSession, createSession, getSession, requireAdmin, requireSession } from "@/lib/auth/session";

const admin = { userId: "usr_001", username: "test", fullName: "Адміністратор тестової системи", role: "Адміністратор" as const };

beforeEach(() => {
  cookieJar.clear();
  redirect.mockClear();
});

describe("session lifecycle", () => {
  // @trace FR-2
  it("creates a signed session that can be read back", async () => {
    await createSession(admin);
    await expect(getSession()).resolves.toMatchObject(admin);
  });

  // @trace FR-5
  it("clears the session cookie on logout", async () => {
    await createSession(admin);
    await clearSession();
    await expect(getSession()).resolves.toBeNull();
  });

  // @trace FR-4
  it("redirects an unauthenticated protected request", async () => {
    await expect(requireSession()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  // @trace FR-6 FR-7 FR-15
  it("rejects a staff session at the admin guard", async () => {
    await createSession({ ...admin, role: "Працівник" });
    await expect(requireAdmin()).rejects.toThrow("Потрібні права адміністратора");
  });

  // @trace FR-6 FR-7
  it("returns an authenticated administrator from the admin guard", async () => {
    await createSession(admin);
    await expect(requireAdmin()).resolves.toMatchObject(admin);
  });
});

// @trace FR-2, FR-4, FR-5, FR-6, FR-7, FR-15
