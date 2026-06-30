import { describe, expect, it } from "vitest";
import { trendSentence } from "./trendSentence";

/** @trace FR-TREND-02 FR-TREND-03 */
describe("trendSentence", () => {
  it("renders the strengthening sentence with a formatted percentage for tone=up", () => {
    expect(trendSentence("USD", 1.2, "up")).toBe(
      "USD за тиждень зміцнів на 1,20% до гривні.",
    );
  });

  it("renders the weakening sentence with the absolute percentage for tone=down", () => {
    expect(trendSentence("EUR", -0.8, "down")).toBe(
      "EUR за тиждень послабшав на 0,80% до гривні.",
    );
  });

  it("renders the flat sentence with no percentage for tone=flat", () => {
    expect(trendSentence("PLN", 0.01, "flat")).toBe(
      "PLN за тиждень майже без змін до гривні.",
    );
  });

  it("never includes an exclamation mark, regardless of tone", () => {
    expect(trendSentence("USD", 5, "up")).not.toMatch(/!/);
    expect(trendSentence("USD", -5, "down")).not.toMatch(/!/);
    expect(trendSentence("USD", 0, "flat")).not.toMatch(/!/);
  });

  it("formats the percentage with up to 2 decimals, uk-UA comma", () => {
    expect(trendSentence("USD", 1.2345, "up")).toBe(
      "USD за тиждень зміцнів на 1,23% до гривні.",
    );
  });
});
