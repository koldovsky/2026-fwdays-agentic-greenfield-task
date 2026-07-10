// Test-first (red -> green): remediates review-gate finding cluster "the
// model never receives a system prompt or any conversation context — each
// turn is context-free" (CRITICAL) + "addressesParent is a dead pure
// function, never wired into the model's context" (MAJOR).
//
// `buildSystemPrompt(state)` is a pure, synchronous, framework-free function
// (no `next/*`, no React, no Telegram SDK, no Anthropic SDK) — testable in
// complete isolation from `ModelPort`/`loop.ts`. These tests pin its two
// halves: the STATIC block (DESIGN.md voice rules embedded verbatim +
// BC-LANG-01 + FR-GUARD-05 off-topic steering + FR-FAQ-02 fallback +
// FR-GUARD-01 closed-tool discipline) and the DYNAMIC block (derived live
// from the current `IntakeState` — conversationState, collected fields, the
// next needed field, and `addressesParent`-driven addressing per BC-AGE-02).
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./system-prompt.ts";
import { initialIntakeState, type IntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

describe("buildSystemPrompt — static block (DESIGN.md voice, verbatim)", () => {
  // @trace BC-BRAND-01
  it("is a non-empty string containing a DESIGN.md voice marker verbatim", () => {
    const system = buildSystemPrompt(initialIntakeState());

    expect(system.length).toBeGreaterThan(0);
    // Verbatim phrases lifted from DESIGN.md's "Voice & content rules"
    // section — proves the static block is the ACTUAL embedded voice
    // rules, not a paraphrase.
    expect(system).toContain("Kind refusals: say no warmly, then offer the nearest yes.");
    expect(system).toContain("Налаштуємось?");
  });

  // @trace BC-LANG-01
  it("contains Ukrainian-first instruction text", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).toContain("Ukrainian-first");
    expect(system).toContain("завжди відповідайте українською");
  });

  // @trace FR-GUARD-05
  it("instructs off-topic steering: no substantive answer, redirect within the same reply, no tool call", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).toContain("FR-GUARD-05");
    expect(system.toLowerCase()).toContain("off-topic");
  });

  // @trace FR-FAQ-02
  it("contains the deterministic FAQ fallback line ('адміністратор уточнить')", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).toContain("адміністратор уточнить");
  });

  // @trace FR-SLOT-02 — date awareness: given "today", the prompt states the
  // date + its Ukrainian weekday and instructs the model to resolve a
  // relative/absolute day the lead names into a concrete date + propose_slots
  // `date`. Absent when no "today" is supplied (backward-compatible).
  describe("date awareness (today + relative-date resolution guidance)", () => {
    it("states today's date and Ukrainian weekday when `today` is supplied", () => {
      const system = buildSystemPrompt(initialIntakeState(), "", "2026-07-10");
      expect(system).toContain("2026-07-10");
      expect(system).toContain("пʼятниця"); // 2026-07-10 is a Friday
    });

    it("instructs the model to resolve a named day into a concrete date and call propose_slots with `date`", () => {
      const system = buildSystemPrompt(initialIntakeState(), "", "2026-07-10");
      expect(system).toContain("завтра");
      expect(system).toContain("date");
    });

    it("omits the date line entirely when `today` is not supplied (unchanged behaviour)", () => {
      const system = buildSystemPrompt(initialIntakeState());
      expect(system).not.toContain("Сьогодні:");
    });
  });

  // --- kb-learning tasks.md C.5 (RED) — design.md Decision 1's rewrite of --
  // --- the FR-FAQ-02 static-block sentence -------------------------------
  // The pre-kb-learning FR-FAQ-02 sentence literally says "do not call a
  // tool for this ... that is a later capability, not this one" — an
  // accurate description of the pre-S5 deferral, now WRONG: `answer_faq`/
  // `log_question` exist (tools.ts, tasks.md C.1/C.2) and MUST be named by
  // the static prompt so the model knows to call them. Every assertion
  // below is expected to FAIL red against today's system-prompt.ts (which
  // still carries the OLD sentence, unnamed tools, no category
  // enumeration) until tasks.md C.6 (GREEN) rewrites it.
  describe("static block — FR-FAQ-02 rewrite naming answer_faq/log_question + BC-PRICE-01 categories (kb-learning design.md Decision 1, tasks.md C.5 — RED)", () => {
    // @trace FR-FAQ-02
    it("names both answer_faq and log_question by their literal tool names", () => {
      const system = buildSystemPrompt(initialIntakeState());
      expect(system).toContain("answer_faq");
      expect(system).toContain("log_question");
    });

    // @trace FR-GUARD-02
    it("enumerates all four BC-PRICE-01 categories: price, lesson duration, group composition/size, discounts", () => {
      const system = buildSystemPrompt(initialIntakeState());
      expect(system.toLowerCase()).toContain("price");
      expect(system.toLowerCase()).toContain("lesson duration");
      expect(system.toLowerCase()).toContain("group composition");
      expect(system.toLowerCase()).toContain("discount");
    });

    // @trace FR-FAQ-02
    it("no longer contains the OLD 'that is a later capability, not this one' deferral sentence", () => {
      const system = buildSystemPrompt(initialIntakeState());
      expect(system).not.toContain("that is a later capability, not this one");
    });
  });

  // --- kb-learning tasks.md C.5 (RED) — design.md Decision 1's KB block ---
  describe("KB text folding (kb-learning design.md Decision 1, tasks.md C.5 — RED, pins buildSystemPrompt's 2nd-parameter signature)", () => {
    // @trace FR-FAQ-01
    it("folds a supplied non-empty KB text VERBATIM into the prompt output", () => {
      const kbText =
        "## Індивідуальні заняття\n\n45 хвилин, 600 грн — kb-learning-fixture-marker-8f21a";
      const system = buildSystemPrompt(initialIntakeState(), kbText);
      expect(system).toContain(kbText);
    });

    // @trace FR-GUARD-02
    it("an EMPTY KB string still produces a valid, non-crashing, non-empty prompt", () => {
      expect(() => buildSystemPrompt(initialIntakeState(), "")).not.toThrow();
      const system = buildSystemPrompt(initialIntakeState(), "");
      expect(system.length).toBeGreaterThan(0);
    });
  });

  // @trace FR-GUARD-01
  it("states the closed-tool discipline: only code-vetted options, never claim to confirm a booking", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).toContain("FR-GUARD-01");
    expect(system.toLowerCase()).toContain("confirm");
  });
});

describe("buildSystemPrompt — dynamic block (state-derived context)", () => {
  // @trace TC-STACK-02 (loop context wiring)
  it("names the current conversationState verbatim", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain('"profiling"');
  });

  it("lists already-collected fields", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("Богдан");
    expect(system).toContain("studentAge");
    expect(system).toContain("9");
  });

  // @trace FR-INTAKE-02
  it("names the single next needed field for a fresh (greeting) state", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).toContain("studentName");
  });

  // @trace FR-INTAKE-06
  it("names preferredWeekdays as the next needed field once name/age/format are collected (profiling dropped)", () => {
    // Qualifying completion now advances straight to collecting (mandatory-only
    // 5-step MVP), so the next needed field is the days+time step, not a goal.
    const state: IntakeState = {
      conversationState: "collecting",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("preferredWeekdays");
  });

  // @trace FR-INTAKE-06
  it("names preferredTimeRange as the next needed field once weekdays are collected", () => {
    const state: IntakeState = {
      conversationState: "collecting",
      fields: {
        studentName: "Богдан",
        studentAge: 9,
        format: "individual",
        preferredWeekdays: "вт, чт",
      },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("preferredTimeRange");
  });

  // @trace BC-AGE-02 — the fix that makes addressesParent live.
  it("instructs PARENT-addressing when studentAge < 10", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 7, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("БАТЬКІВ");
    expect(system).not.toContain("БЕЗПОСЕРЕДНЬО");
  });

  // @trace BC-AGE-02
  it("instructs STUDENT-direct-addressing when studentAge >= 10", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Оксана", studentAge: 14, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("БЕЗПОСЕРЕДНЬО");
    expect(system).not.toContain("БАТЬКІВ");
  });

  // @trace BC-AGE-02 — boundary: exactly 10 is student-addressed.
  it("addresses the student directly at exactly age 10 (the addressesParent(age) boundary)", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 10, format: "individual" },
    };
    const system = buildSystemPrompt(state);
    expect(system).toContain("БЕЗПОСЕРЕДНЬО");
  });

  it("does not force an addressing verdict before the age is known", () => {
    const system = buildSystemPrompt(initialIntakeState());
    expect(system).not.toContain("БАТЬКІВ");
    expect(system).not.toContain("БЕЗПОСЕРЕДНЬО");
  });
});
