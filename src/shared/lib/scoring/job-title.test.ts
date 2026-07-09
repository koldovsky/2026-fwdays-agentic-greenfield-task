// extractJobTitle — pure, deterministic (TC-PURE-01), FR-HISTORY-01.
import { describe, expect, it } from "vitest";

import { extractJobTitle } from "./job-title";

describe("extractJobTitle", () => {
  it("extracts a labelled role (English)", () => {
    expect(extractJobTitle("Position: Senior React Developer\nWe are hiring…")).toBe(
      "Senior React Developer",
    );
  });

  it("extracts a labelled role (Ukrainian)", () => {
    expect(extractJobTitle("Вакансія: Frontend-розробник\nОбов'язки: …")).toBe(
      "Frontend-розробник",
    );
  });

  it("matches a label that is the trailing word of a phrase", () => {
    expect(extractJobTitle("Job title: Staff Engineer")).toBe("Staff Engineer");
  });

  it("falls back to the first title-like line when unlabelled", () => {
    expect(extractJobTitle("Backend Engineer (Go)\n\nAbout the role: we build…")).toBe(
      "Backend Engineer (Go)",
    );
  });

  it("strips a leading bullet/dash and surrounding quotes", () => {
    expect(extractJobTitle('- "Product Designer"')).toBe("Product Designer");
  });

  it("collapses internal whitespace", () => {
    expect(extractJobTitle("Senior    QA    Automation")).toBe("Senior QA Automation");
  });

  it("returns null for a prose-only blob with no title line", () => {
    const prose =
      "We are a fast-growing company looking for someone passionate about building great products for our users every day.";
    expect(extractJobTitle(prose)).toBeNull();
  });

  it("rejects a sentence as a title", () => {
    expect(extractJobTitle("We are hiring a new teammate.")).toBeNull();
  });

  it("rejects an over-long candidate line", () => {
    const long = "Senior " + "Very ".repeat(30) + "Engineer";
    expect(extractJobTitle(long)).toBeNull();
  });

  it("returns null on empty / whitespace input", () => {
    expect(extractJobTitle("")).toBeNull();
    expect(extractJobTitle("   \n  \n ")).toBeNull();
  });

  it("ignores a label whose value is empty and scans on", () => {
    expect(extractJobTitle("Position:\nMobile Engineer")).toBe("Mobile Engineer");
  });

  it("is deterministic across calls", () => {
    const jd = "Role: Data Scientist\nStack: Python";
    expect(extractJobTitle(jd)).toBe(extractJobTitle(jd));
  });
});
