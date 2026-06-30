import { describe, expect, it } from "vitest";
import {
  parseThemePreference,
  themeToDataAttribute,
  themeToStorageValue,
} from "./theme";

/** @trace FR-SHELL-03 */
describe("parseThemePreference", () => {
  it("returns light for null", () => {
    expect(parseThemePreference(null)).toBe("light");
  });

  it("returns light for undefined", () => {
    expect(parseThemePreference(undefined)).toBe("light");
  });

  it("returns light for unknown values", () => {
    expect(parseThemePreference("")).toBe("light");
    expect(parseThemePreference("light-mode")).toBe("light");
    expect(parseThemePreference("LIGHT")).toBe("light");
  });

  it('returns dark for "dark"', () => {
    expect(parseThemePreference("dark")).toBe("dark");
  });
});

/** @trace FR-SHELL-03 */
describe("themeToDataAttribute", () => {
  it('returns "dark" for dark theme', () => {
    expect(themeToDataAttribute("dark")).toBe("dark");
  });

  it("returns empty string for light theme", () => {
    expect(themeToDataAttribute("light")).toBe("");
  });
});

/** @trace FR-SHELL-03 */
describe("themeToStorageValue", () => {
  it("serialises light and dark", () => {
    expect(themeToStorageValue("light")).toBe("light");
    expect(themeToStorageValue("dark")).toBe("dark");
  });
});
