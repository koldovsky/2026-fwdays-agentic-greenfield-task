import { describe, expect, it } from "vitest";
import type { User } from "../model/types";
import { displayLabel, isAnonymous } from "./user";

const base: User = {
  id: "u1",
  email: "ada@example.com",
  name: "Ada",
  authProvider: "password",
  createdAt: "2026-07-02T00:00:00.000Z",
};

describe("isAnonymous", () => {
  it("true for the anonymous provider", () => {
    expect(isAnonymous({ ...base, authProvider: "anonymous", email: null })).toBe(true);
  });

  it("true when email is null regardless of provider", () => {
    expect(isAnonymous({ ...base, email: null })).toBe(true);
  });

  it("false for a signed-up account", () => {
    expect(isAnonymous(base)).toBe(false);
  });
});

describe("displayLabel", () => {
  it("prefers the name", () => {
    expect(displayLabel(base)).toBe("Ada");
  });

  it("falls back to email when no name", () => {
    expect(displayLabel({ ...base, name: null })).toBe("ada@example.com");
  });

  it("falls back to a neutral label when anonymous", () => {
    expect(displayLabel({ ...base, name: null, email: null })).toBe("Гість");
  });
});
