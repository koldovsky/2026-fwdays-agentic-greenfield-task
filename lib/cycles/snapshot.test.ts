// @trace FR-CYCLE-03
import { describe, expect, it } from "vitest";
import { buildTemplateSnapshot, snapshotSchema } from "@/lib/cycles/snapshot";

/**
 * Red-first unit tests for the template snapshot (FR-CYCLE-03). The module does
 * not exist yet, so this suite MUST fail red. Asserts BEHAVIOUR: the snapshot
 * copies name + methodology + the ordered question list; it is FROZEN /
 * deep-cloned so a later mutation of the source object never alters a
 * previously-built snapshot; it parses against `snapshotSchema`; a malformed
 * snapshot is rejected at the boundary.
 */

/**
 * A template-with-ordered-questions plain object, mixed scale + open. Built
 * fresh per test so a mutation in one case cannot leak into another.
 */
function makeTemplate() {
  return {
    name: "Probation check-in",
    methodology: "probation",
    questions: [
      {
        id: "q-scale-1",
        order: 1,
        text: "How clearly were the expectations communicated?",
        type: "scale",
        required: true,
        anchors: [
          { value: 1, label: "Not at all" },
          { value: 2, label: "Somewhat" },
          { value: 3, label: "Clearly" },
        ],
      },
      {
        id: "q-open-1",
        order: 2,
        text: "What would you keep, and what would you change?",
        type: "open",
        required: false,
      },
    ],
  };
}

describe("buildTemplateSnapshot — copies the template", () => {
  it("keeps the same name and methodology", () => {
    const template = makeTemplate();
    const snapshot = buildTemplateSnapshot(template);
    expect(snapshot.name).toBe("Probation check-in");
    expect(snapshot.methodology).toBe("probation");
  });

  it("keeps the questions in order with id, order, text, type, required", () => {
    const template = makeTemplate();
    const snapshot = buildTemplateSnapshot(template);
    expect(snapshot.questions.map((q) => q.id)).toEqual(["q-scale-1", "q-open-1"]);
    expect(snapshot.questions.map((q) => q.order)).toEqual([1, 2]);
    expect(snapshot.questions[0].type).toBe("scale");
    expect(snapshot.questions[0].required).toBe(true);
    expect(snapshot.questions[1].type).toBe("open");
    expect(snapshot.questions[1].required).toBe(false);
  });

  it("carries the scale anchors of a scale question", () => {
    const template = makeTemplate();
    const snapshot = buildTemplateSnapshot(template);
    const first = snapshot.questions[0];
    expect(first.type).toBe("scale");
    if (first.type !== "scale") return;
    expect(first.anchors.map((a) => a.value)).toEqual([1, 2, 3]);
  });
});

describe("buildTemplateSnapshot — frozen / deep-cloned (FR-CYCLE-03)", () => {
  it("does not change a built snapshot when the source name is later mutated", () => {
    const template = makeTemplate();
    const snapshot = buildTemplateSnapshot(template);
    template.name = "Mutated after launch";
    expect(snapshot.name).toBe("Probation check-in");
  });

  it("does not change a built snapshot when the source questions array is mutated", () => {
    const template = makeTemplate();
    const snapshot = buildTemplateSnapshot(template);
    const originalLength = snapshot.questions.length;
    template.questions.push({
      id: "q-injected",
      order: 3,
      text: "Sneaky late addition",
      type: "open",
      required: true,
    });
    template.questions[0].text = "Edited text";
    expect(snapshot.questions.length).toBe(originalLength);
    expect(snapshot.questions[0].text).toBe(
      "How clearly were the expectations communicated?",
    );
  });
});

describe("snapshotSchema — validation", () => {
  it("accepts a well-formed snapshot built from the template", () => {
    const snapshot = buildTemplateSnapshot(makeTemplate());
    expect(snapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it("rejects a snapshot missing the name", () => {
    const snapshot = buildTemplateSnapshot(makeTemplate());
    const { name: _name, ...withoutName } = snapshot;
    void _name;
    expect(snapshotSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects a snapshot with an empty questions list", () => {
    const snapshot = buildTemplateSnapshot(makeTemplate());
    expect(snapshotSchema.safeParse({ ...snapshot, questions: [] }).success).toBe(false);
  });
});
