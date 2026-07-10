import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { uk } from "@/lib/i18n/uk";
import { shellContent, shellLayoutRegions } from "./shell-content";

describe("shellContent", () => {
  // @trace FR-SHELL-01, FR-SHELL-03
  it("contains Ukrainian-first Weather Explorer shell copy without default city", () => {
    const text = [
      shellContent.wordmark,
      shellContent.heroTitle,
      shellContent.heroSubtitle,
      shellContent.searchLabel,
      shellContent.searchPlaceholder,
    ].join(" ");

    expect(shellContent.wordmark).toBe("Weather Explorer");
    expect(shellContent.searchLabel).toMatch(/[а-яіїєґ]/i);
    expect(text).not.toContain("!");
    expect(text.toLowerCase()).not.toMatch(/київ|kyiv|default city/);
    expect(shellContent.geolocationPolicy).toContain("лише після вашої дії");
    expect(shellContent.themeIndicator).toBe("Системна тема");
  });

  // @trace NFR-I18N-01
  it("uses the Ukrainian i18n scaffold with English fallback strings", () => {
    expect(shellContent).toBe(uk.shell);
    expect(en.shell.wordmark).toBe(shellContent.wordmark);
    expect(en.shell.searchLabel).toBeTruthy();
  });

  // @trace FR-SHELL-02
  it("describes responsive regions for mobile, tablet, and desktop", () => {
    expect(shellLayoutRegions.mobile).toEqual([
      "hero-search",
      "forecast-placeholder",
      "map-placeholder",
    ]);
    expect(shellLayoutRegions.tablet).toEqual([
      "forecast-placeholder",
      "map-placeholder",
    ]);
    expect(shellLayoutRegions.desktop).toEqual([
      "side-panel",
      "forecast-placeholder",
      "map-placeholder",
    ]);
  });
});
