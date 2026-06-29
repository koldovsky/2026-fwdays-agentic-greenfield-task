// RED (Phase 4b) — tests written from the spec BEFORE the implementation exists.
// Pins the FROZEN shared server-action result contract (design.md D3) that
// slices 2–5 depend on. Imports will fail until lib/forms/result.ts is built.
//
// @trace FR-SHELL-03
// @trace NFR-LOC-01
import { describe, expect, it } from "vitest";

import {
  type ActionResult,
  type FieldErrors,
  fieldError,
  formError,
  ok,
} from "@/lib/forms/result";

describe("ok()", () => {
  it("returns a success result with ok:true", () => {
    const result = ok();
    expect(result.ok).toBe(true);
  });

  it("carries the success payload under data when provided", () => {
    const result = ok({ id: 42 });
    expect(result).toEqual({ ok: true, data: { id: 42 } });
  });

  it("omits a payload when none is given (data is undefined, not an error shape)", () => {
    const result = ok();
    // success must never carry fieldErrors/formError
    expect(result).toEqual({ ok: true, data: undefined });
    expect("fieldErrors" in result).toBe(false);
    expect("formError" in result).toBe(false);
  });

  it("narrows the discriminated union to the success arm on ok===true", () => {
    const result: ActionResult<{ id: number }> = ok({ id: 1 });
    if (result.ok) {
      // type-level: only the success arm exposes data — this must compile
      expect(result.data).toEqual({ id: 1 });
    } else {
      throw new Error("ok() must produce the success arm");
    }
  });
});

describe("fieldError()", () => {
  it("returns a failure result keyed by field name -> Ukrainian message", () => {
    const errors: FieldErrors = { name: "Вкажіть назву рослини" };
    const result = fieldError(errors);
    expect(result).toEqual({ ok: false, fieldErrors: errors });
  });

  it("is a failure arm: ok is false and no formError is set", () => {
    const result = fieldError({ height: "Значення має бути числом" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toEqual({ height: "Значення має бути числом" });
      expect(result.formError).toBeUndefined();
    }
  });

  it("supports multiple fields so a form can place each message inline", () => {
    const result = fieldError({
      name: "Вкажіть назву рослини",
      acquiredAt: "Дата не може бути в майбутньому",
    });
    if (result.ok) throw new Error("must be a failure arm");
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["name", "acquiredAt"]);
  });

  it("omits values when none are echoed (no input-repopulation key)", () => {
    // Deliberate contract extension (design.md D3): values is OPTIONAL — when
    // not echoed the failure shape carries no `values` key.
    const result = fieldError({ name: "Вкажіть назву рослини" });
    expect("values" in result).toBe(false);
  });

  it("echoes submitted values so the form can repopulate inputs after the React 19 reset", () => {
    // FR-SHELL-03 "input intact": React 19 <form action> auto-resets uncontrolled
    // fields on completion, so a failure result echoes the submitted values for
    // defaultValue repopulation.
    const result = fieldError(
      { name: "Вкажіть назву рослини" },
      { name: "", notes: "трохи тексту" },
    );
    if (result.ok) throw new Error("must be a failure arm");
    expect(result.values).toEqual({ name: "", notes: "трохи тексту" });
  });
});

describe("formError()", () => {
  it("returns a failure result carrying a whole-form Ukrainian message", () => {
    const result = formError("Не вдалося зберегти запис");
    expect(result).toEqual({ ok: false, formError: "Не вдалося зберегти запис" });
  });

  it("is a failure arm: ok is false and no fieldErrors is set", () => {
    const result = formError("Не вдалося зберегти запис");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.formError).toBe("Не вдалося зберегти запис");
      expect(result.fieldErrors).toBeUndefined();
    }
  });

  it("optionally echoes submitted values for input repopulation", () => {
    const result = formError("Не вдалося зберегти запис", { name: "Фікус" });
    if (result.ok) throw new Error("must be a failure arm");
    expect(result.values).toEqual({ name: "Фікус" });
  });
});

describe("ActionResult discrimination", () => {
  it("a success and a failure are distinguishable by the ok tag alone", () => {
    const results: ActionResult[] = [ok(), fieldError({ name: "x" }), formError("y")];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(2);
  });
});
