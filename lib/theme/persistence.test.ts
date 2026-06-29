// RED (Phase 4b) — tests written from the spec BEFORE the implementation exists.
// Pins the theme-persistence helper (design.md D2): localStorage key
// `pgwt.theme`, values 'light' | 'dark', default 'light', try/catch fallback so
// a missing/corrupt/unreadable store never throws (FR-SHELL-02 corrupt-value
// scenario, Risk R4). Imports will fail until lib/theme/persistence.ts is built.
//
// @trace FR-SHELL-02
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
  normalizeTheme,
  persistTheme,
  readTheme,
} from "@/lib/theme/persistence";

afterEach(() => {
  vi.restoreAllMocks();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("constants", () => {
  it("persists under the agreed localStorage key", () => {
    // The pre-hydration inline script and ThemeProvider must read the SAME key.
    expect(THEME_STORAGE_KEY).toBe("pgwt.theme");
  });

  it("defaults to light", () => {
    expect(DEFAULT_THEME).toBe("light");
  });
});

describe("normalizeTheme()", () => {
  it("passes through 'light'", () => {
    expect(normalizeTheme("light")).toBe("light");
  });

  it("passes through 'dark'", () => {
    expect(normalizeTheme("dark")).toBe("dark");
  });

  it("falls back to the default for an unknown string", () => {
    expect(normalizeTheme("ultraviolet")).toBe(DEFAULT_THEME);
  });

  it("falls back to the default for null/undefined/empty", () => {
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME);
    expect(normalizeTheme(undefined)).toBe(DEFAULT_THEME);
    expect(normalizeTheme("")).toBe(DEFAULT_THEME);
  });

  it("is case-sensitive: 'Dark' is not a valid stored value, falls back", () => {
    expect(normalizeTheme("Dark")).toBe(DEFAULT_THEME);
  });
});

describe("readTheme()", () => {
  it("reads a previously persisted dark preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readTheme()).toBe("dark");
  });

  it("returns the default when nothing is persisted", () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it("returns the default (no throw) when the stored value is corrupt", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "{not-a-theme}");
    expect(() => readTheme()).not.toThrow();
    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it("returns the default (no throw) when localStorage access throws (private mode / disabled)", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => readTheme()).not.toThrow();
    expect(readTheme()).toBe(DEFAULT_THEME);
  });
});

describe("persistTheme()", () => {
  it("writes the chosen theme so it survives a reload", () => {
    persistTheme("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("round-trips through readTheme()", () => {
    persistTheme("dark");
    expect(readTheme()).toBe("dark");
    const next: Theme = "light";
    persistTheme(next);
    expect(readTheme()).toBe("light");
  });

  it("does not throw when localStorage write fails (disabled store)", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => persistTheme("dark")).not.toThrow();
  });
});
