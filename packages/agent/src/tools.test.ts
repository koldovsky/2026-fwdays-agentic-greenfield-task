// Test-first (tasks.md 4.3, extended by kb-learning tasks.md C.1): the closed
// tool set (design.md Decision 2; kb-learning design.md Decision 4).
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
//
// kb-learning tasks.md C.1 (RED half): `answer_faq`/`log_question` are NOT
// in `tools.ts` yet (booking-hitl's own slice deliberately omitted them —
// see the old regression test this file used to carry, now superseded and
// removed below since kb-learning's own baseline spec requires exactly the
// opposite: these two tools MUST exist, each carrying ONLY a `question:
// string` input, no answer/content payload — the model narrates the reply
// itself, it never hands the answer text to a tool (`@trace FR-GUARD-01`,
// `@trace FR-GUARD-06`)). Every assertion referencing these two names below
// is therefore expected to FAIL (red) against today's 16-tool `TOOLS`
// array, until kb-learning tasks.md C.2 (GREEN) adds them.
import { describe, expect, it } from "vitest";
import { TOOL_NAMES, TOOLS } from "./tools.ts";

const EXPECTED_TOOL_NAMES = [
  "save_name",
  "save_age",
  "save_format",
  // save_goal / skip_goal / save_tastes / skip_tastes / save_experience_comfort
  // REMOVED 2026-07-09: the MVP intake is mandatory-only (5 steps), the model
  // is never offered a goal/tastes/experience tool.
  "save_weekdays",
  "save_time_range",
  "amend_field",
  "cancel_request",
  "explain_scope",
  "explain_format",
  "propose_slots",
  "request_hold",
  // kb-learning tasks.md C.1 (design.md Decision 4) — RED until C.2 lands.
  "answer_faq",
  "log_question",
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

  // kb-learning tasks.md C.1 (design.md Decision 4) — RED until C.2 (GREEN)
  // adds the two tool definitions to tools.ts. Supersedes the OLD regression
  // guard this file used to carry ("never contains log_question or
  // answer_faq") — that guard pinned booking-hitl's own deliberate omission
  // of these two tools; kb-learning's own baseline spec requires exactly the
  // opposite, so the old assertion is removed rather than left to
  // permanently contradict this slice's spec.
  //
  // NAMES ARE THE GUARDRAIL SURFACE (this file's own header, and tools.ts's):
  // `answer_faq`/`log_question` carry ONLY a `question: string` input — no
  // answer/content payload — because the model must never be handed a tool
  // through which it could claim to have written or fetched an answer from
  // anywhere other than the KB block already in its context; it narrates the
  // reply itself, in the SAME turn, and these two tools exist purely to log
  // which question was asked and how it was answered (`@trace FR-GUARD-01`,
  // `@trace FR-GUARD-06`).
  describe("answer_faq / log_question — logging-only tools, no answer payload (design.md Decision 4)", () => {
    for (const name of ["answer_faq", "log_question"] as const) {
      // @trace FR-GUARD-01
      // @trace FR-GUARD-06
      it(`${name} has a required 'question: string' input and NO other property`, () => {
        const tool = TOOLS.find((candidate) => candidate.name === name);
        expect(tool).toBeDefined();
        const properties = tool?.input_schema.properties as Record<string, { type?: string } | undefined>;
        expect(Object.keys(properties ?? {})).toEqual(["question"]);
        expect(properties?.question?.type).toBe("string");
        expect(tool?.input_schema.required).toEqual(["question"]);
      });
    }

    // @trace FR-GUARD-01
    // @trace FR-GUARD-06
    it("both new names pass the existing confirm*/*kb*write* guardrail pattern too (explicit double-check, not just via TOOL_NAMES membership)", () => {
      for (const name of ["answer_faq", "log_question"]) {
        expect(TOOL_NAMES).toContain(name);
        const lowered = name.toLowerCase();
        expect(lowered).not.toMatch(/^confirm/);
        expect(lowered).not.toMatch(/kb.*write/);
        expect(lowered).not.toMatch(/write.*kb/);
      }
    });
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
    it("the closed TOOL_NAMES list is otherwise UNCHANGED by this schema edit — still exactly EXPECTED_TOOL_NAMES.length names, none confirm*/*kb*write*", () => {
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
