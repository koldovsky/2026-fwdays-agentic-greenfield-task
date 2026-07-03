import { describe, expect, it } from "vitest";

import { renderPlainText } from "./render-text";

describe("renderPlainText", () => {
  it("renders headline, bullets, and footer separated by blank lines", () => {
    expect(
      renderPlainText({
        headline: "Адаптоване резюме",
        bullets: ["Shipped a React platform.", "Led onboarding."],
        footer: "Tailored with Vouch",
      }),
    ).toBe(
      "Адаптоване резюме\n\n- Shipped a React platform.\n- Led onboarding.\n\nTailored with Vouch",
    );
  });

  it("omits an absent headline and footer", () => {
    expect(renderPlainText({ bullets: ["Only bullet."] })).toBe("- Only bullet.");
  });

  it("returns an empty string for no bullets and no chrome", () => {
    expect(renderPlainText({ bullets: [] })).toBe("");
  });
});
