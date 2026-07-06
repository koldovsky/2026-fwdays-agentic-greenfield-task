// Test-first (tasks.md 4.3): the closed tool set (design.md Decision 2).
//
// Unlike most of this section's red round, `tools.ts` ships its `TOOLS`
// array as REAL content already (see tools.ts's own header) — the same
// "plain data literal, no behaviour to fake" shape as
// `lib/src/intake/copy.test.ts` (tasks.md 2.4's own precedent) and this
// package's `model-port.test`-shaped config assertions. Every assertion
// below is therefore expected to be GREEN already, immediately, against
// real `tools.ts` content — not a red round waiting on a later
// implementation pass. This is called out explicitly, in the test-engineer
// report, as green-by-nature (task instructions' own carve-out for
// "MODEL_CONFIG/tool-list/static-guardrail assertions").
import { describe, expect, it } from "vitest";
import { TOOL_NAMES, TOOLS } from "./tools.ts";

const EXPECTED_TOOL_NAMES = [
  "save_name",
  "save_age",
  "save_format",
  "save_goal",
  "skip_goal",
  "save_tastes",
  "skip_tastes",
  "save_experience_comfort",
  "save_weekdays",
  "save_time_range",
  "amend_field",
  "cancel_request",
  "explain_scope",
  "explain_format",
  "propose_slots",
  "request_hold",
];

describe("the agent's closed tool set", () => {
  // @trace FR-GUARD-01
  // @trace FR-GUARD-06
  it("is exactly the closed list from design.md Decision 2 — no more, no fewer", () => {
    expect([...TOOL_NAMES].sort()).toEqual([...EXPECTED_TOOL_NAMES].sort());
    expect(TOOLS).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });

  // @trace FR-GUARD-01
  it("never contains a tool whose name starts with 'confirm' (the confirmed-booking transition has no agent tool, ever)", () => {
    for (const name of TOOL_NAMES) {
      expect(name.toLowerCase()).not.toMatch(/^confirm/);
    }
  });

  // @trace FR-GUARD-06
  it("never contains a knowledge-base-write tool ('kb'+'write' in any order/casing)", () => {
    for (const name of TOOL_NAMES) {
      const lowered = name.toLowerCase();
      expect(lowered).not.toMatch(/kb.*write/);
      expect(lowered).not.toMatch(/write.*kb/);
    }
  });

  // Named regression guard: the S5 kb-learning tools this slice deliberately
  // omits (design.md Decision 2's "chosen (b)") must not sneak in early.
  it("never contains log_question or answer_faq (S5 kb-learning's tools, out of this slice's scope)", () => {
    expect(TOOL_NAMES).not.toContain("log_question");
    expect(TOOL_NAMES).not.toContain("answer_faq");
  });

  // @trace FR-INTAKE-02
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  // @trace BC-FORMAT-01
  it("save_format's JSON schema enum is exactly [individual, group, unsure, instrument]", () => {
    const saveFormat = TOOLS.find((tool) => tool.name === "save_format");
    expect(saveFormat).toBeDefined();
    const formatProperty = saveFormat?.input_schema.properties.format as { enum?: string[] } | undefined;
    expect(formatProperty?.enum).toEqual(["individual", "group", "unsure", "instrument"]);
  });

  it("every tool definition has a non-empty name, description, and an object-typed input_schema", () => {
    for (const tool of TOOLS) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.input_schema.type).toBe("object");
    }
  });

  // --- booking-hitl tasks.md C.1 (design.md Decision 2's sub-decision) -----
  // `propose_slots` gains structured `weekdays`/`timeWindow` parameters — the
  // model re-extracts them from the lead's own free-text answer, code
  // validates twice (schema enum here, `validatePreferences` at the loop
  // layer, tasks.md C.3).
  describe("propose_slots' structured weekdays/timeWindow schema (booking-hitl design.md Decision 2)", () => {
    // @trace FR-SLOT-01
    it("weekdays is a required array property whose items enum is exactly [Mon, Tue, Wed, Thu, Fri]", () => {
      const proposeSlots = TOOLS.find((tool) => tool.name === "propose_slots");
      expect(proposeSlots).toBeDefined();
      const properties = proposeSlots!.input_schema.properties as Record<
        string,
        { type?: string; items?: { enum?: string[] } } | undefined
      >;
      expect(properties.weekdays?.type).toBe("array");
      expect(properties.weekdays?.items?.enum).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
      expect(proposeSlots!.input_schema.required).toContain("weekdays");
    });

    // @trace FR-SLOT-01
    it("timeWindow is a required object property with required start/end string sub-properties", () => {
      const proposeSlots = TOOLS.find((tool) => tool.name === "propose_slots");
      expect(proposeSlots).toBeDefined();
      const properties = proposeSlots!.input_schema.properties as Record<
        string,
        | {
            type?: string;
            properties?: Record<string, { type?: string } | undefined>;
            required?: string[];
          }
        | undefined
      >;
      expect(properties.timeWindow?.type).toBe("object");
      expect(properties.timeWindow?.properties?.start?.type).toBe("string");
      expect(properties.timeWindow?.properties?.end?.type).toBe("string");
      expect(properties.timeWindow?.required).toEqual(expect.arrayContaining(["start", "end"]));
      expect(proposeSlots!.input_schema.required).toContain("timeWindow");
    });

    // @trace FR-GUARD-01
    // @trace FR-GUARD-06
    it("the closed TOOL_NAMES list is otherwise UNCHANGED by this schema edit — still exactly sixteen names, none confirm*/*kb*write*", () => {
      expect(TOOLS).toHaveLength(EXPECTED_TOOL_NAMES.length);
      expect([...TOOL_NAMES].sort()).toEqual([...EXPECTED_TOOL_NAMES].sort());
      for (const name of TOOL_NAMES) {
        const lowered = name.toLowerCase();
        expect(lowered).not.toMatch(/^confirm/);
        expect(lowered).not.toMatch(/kb.*write/);
        expect(lowered).not.toMatch(/write.*kb/);
      }
    });
  });
});
