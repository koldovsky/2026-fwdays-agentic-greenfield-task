// Unit test for the Ukrainian pluralization helper (review fix #5, FR-REM-03).
// Verifies the standard mod-100/mod-10 rule across the boundary counts: 0, 1, 2,
// 4, 5, 11, 21, 22 — the cases that distinguish the one/few/many forms.
//
// @trace FR-REM-03
import { describe, expect, it } from "vitest";

import { ukPlural, ukPluralForm } from "@/lib/i18n/plural";

const PLANT = { one: "рослина", few: "рослини", many: "рослин" };

describe("ukPluralForm — Ukrainian numeric category", () => {
  it.each([
    [0, "many"],
    [1, "one"],
    [2, "few"],
    [4, "few"],
    [5, "many"],
    [11, "many"],
    [12, "many"],
    [14, "many"],
    [21, "one"],
    [22, "few"],
    [25, "many"],
    [111, "many"],
  ] as const)("count %i -> %s form", (count, form) => {
    expect(ukPluralForm(count)).toBe(form);
  });
});

describe("ukPlural — selects the matching noun form", () => {
  it.each([
    [0, "рослин"],
    [1, "рослина"],
    [2, "рослини"],
    [4, "рослини"],
    [5, "рослин"],
    [11, "рослин"],
    [21, "рослина"],
    [22, "рослини"],
  ] as const)("count %i -> %s", (count, word) => {
    expect(ukPlural(count, PLANT)).toBe(word);
  });
});
