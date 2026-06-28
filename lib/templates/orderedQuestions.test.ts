// @trace FR-TPL-01
import { describe, expect, it } from "vitest";
import { orderedQuestions } from "@/lib/templates/orderedQuestions";

/**
 * Red-first unit tests for the deterministic question ordering (FR-TPL-01).
 * `orderedQuestions` returns questions sorted ascending by `order`, is
 * deterministic across calls, and does NOT mutate its input array.
 */

const q1 = {
  id: "q-1",
  order: 1,
  text: "First by order",
  type: "open",
  required: true,
};

const q2 = {
  id: "q-2",
  order: 2,
  text: "Second by order",
  type: "open",
  required: true,
};

const q3 = {
  id: "q-3",
  order: 3,
  text: "Third by order",
  type: "open",
  required: true,
};

describe("orderedQuestions", () => {
  it("returns questions sorted ascending by order", () => {
    const result = orderedQuestions([q3, q1, q2]);
    expect(result.map((q) => q.order)).toEqual([1, 2, 3]);
    expect(result.map((q) => q.id)).toEqual(["q-1", "q-2", "q-3"]);
  });

  it("is deterministic across two calls on the same input", () => {
    const input = [q2, q3, q1];
    const first = orderedQuestions(input);
    const second = orderedQuestions(input);
    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id));
  });

  it("does not mutate the input array (input order preserved)", () => {
    const input = [q3, q1, q2];
    orderedQuestions(input);
    expect(input.map((q) => q.id)).toEqual(["q-3", "q-1", "q-2"]);
  });
});
