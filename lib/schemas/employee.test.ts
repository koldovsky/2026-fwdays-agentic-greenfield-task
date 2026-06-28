// @trace FR-DIR-01, FR-DIR-03
import { describe, expect, it } from "vitest";
import { employeeInputSchema, toFieldErrors } from "@/lib/schemas/employee";

/**
 * Red-first unit tests for the directory slice (FR-DIR-01, FR-DIR-03).
 * Asserts BEHAVIOUR — which fields pass/fail — not exact human message text,
 * since the per-field messages are Ukrainian-first i18n constants wired later.
 * A failing field must yield a non-empty message via `toFieldErrors`.
 */

/** A fully-valid payload covering all five fields. */
const allFields = {
  fullName: "Mihailo Hrushevskyi",
  email: "mihailo@kolo.example",
  role: "Engineering manager",
  phone: "+380 (44) 123-45-67",
  telegramHandle: "@mihailo_h",
};

/** Find the issue (if any) on a named top-level field. */
function fieldFailed(payload: unknown, field: string): boolean {
  const result = employeeInputSchema.safeParse(payload);
  if (result.success) return false;
  return result.error.issues.some((issue) => issue.path[0] === field);
}

describe("employeeInputSchema — success cases", () => {
  it("accepts a payload with all five fields valid", () => {
    expect(employeeInputSchema.safeParse(allFields).success).toBe(true);
  });

  it("accepts a required-only payload with optionals blank", () => {
    expect(
      employeeInputSchema.safeParse({
        fullName: "Lesia Ukrainka",
        email: "lesia@kolo.example",
        role: "",
        phone: "",
        telegramHandle: "",
      }).success,
    ).toBe(true);
  });

  it("accepts a required-only payload with optionals omitted", () => {
    expect(
      employeeInputSchema.safeParse({
        fullName: "Lesia Ukrainka",
        email: "lesia@kolo.example",
      }).success,
    ).toBe(true);
  });
});

describe("employeeInputSchema — fullName", () => {
  it("rejects an empty full name with an issue on fullName", () => {
    expect(fieldFailed({ ...allFields, fullName: "" }, "fullName")).toBe(true);
  });

  it("rejects a 121-character full name with an issue on fullName", () => {
    expect(fieldFailed({ ...allFields, fullName: "a".repeat(121) }, "fullName")).toBe(true);
  });
});

describe("employeeInputSchema — email", () => {
  it("rejects a malformed email with an issue on email", () => {
    expect(fieldFailed({ ...allFields, email: "not-an-email" }, "email")).toBe(true);
  });

  it("lowercases a mixed-case email so case-variants canonicalise", () => {
    const result = employeeInputSchema.safeParse({ ...allFields, email: "John@Kolo.Example" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("john@kolo.example");
  });

  it("rejects a 255-character email with an issue on email", () => {
    // 255 chars total, still shaped like an email so length is the failing rule.
    const local = "a".repeat(255 - "@kolo.example".length);
    const tooLong = `${local}@kolo.example`;
    expect(tooLong.length).toBe(255);
    expect(fieldFailed({ ...allFields, email: tooLong }, "email")).toBe(true);
  });
});

describe("employeeInputSchema — role", () => {
  it("rejects an 81-character role with an issue on role", () => {
    expect(fieldFailed({ ...allFields, role: "a".repeat(81) }, "role")).toBe(true);
  });
});

describe("employeeInputSchema — phone", () => {
  it("rejects a phone containing letters with an issue on phone", () => {
    expect(fieldFailed({ ...allFields, phone: "call me" }, "phone")).toBe(true);
  });

  it("rejects a 33-character phone with an issue on phone", () => {
    expect(fieldFailed({ ...allFields, phone: "1".repeat(33) }, "phone")).toBe(true);
  });

  it("accepts the locale phone +380 (44) 123-45-67 (no phone issue)", () => {
    expect(fieldFailed({ ...allFields, phone: "+380 (44) 123-45-67" }, "phone")).toBe(false);
  });

  it("accepts the locale phone +1 650-555-0100 (no phone issue)", () => {
    expect(fieldFailed({ ...allFields, phone: "+1 650-555-0100" }, "phone")).toBe(false);
  });

  it("accepts a blank optional phone (no phone issue)", () => {
    expect(fieldFailed({ ...allFields, phone: "" }, "phone")).toBe(false);
  });
});

describe("employeeInputSchema — telegramHandle", () => {
  it("rejects a handle without a leading @ with an issue on telegramHandle", () => {
    expect(fieldFailed({ ...allFields, telegramHandle: "mihailo" }, "telegramHandle")).toBe(true);
  });

  it("rejects a too-short handle @abc with an issue on telegramHandle", () => {
    expect(fieldFailed({ ...allFields, telegramHandle: "@abc" }, "telegramHandle")).toBe(true);
  });

  it("accepts a blank optional telegram handle (no telegramHandle issue)", () => {
    expect(fieldFailed({ ...allFields, telegramHandle: "" }, "telegramHandle")).toBe(false);
  });
});

describe("employeeInputSchema — blank optionals together", () => {
  it("accepts blank role, phone, and telegram alongside valid required fields", () => {
    const result = employeeInputSchema.safeParse({
      fullName: "Taras Shevchenko",
      email: "taras@kolo.example",
      role: "",
      phone: "",
      telegramHandle: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("toFieldErrors", () => {
  it("maps a multi-field ZodError to one non-empty message per failing field", () => {
    const result = employeeInputSchema.safeParse({
      ...allFields,
      fullName: "",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fieldErrors = toFieldErrors(result.error);
    expect(Object.keys(fieldErrors)).toEqual(expect.arrayContaining(["email", "fullName"]));

    const emailMessage = fieldErrors.email;
    const fullNameMessage = fieldErrors.fullName;
    expect(typeof emailMessage).toBe("string");
    expect(typeof fullNameMessage).toBe("string");
    expect(emailMessage && emailMessage.length).toBeGreaterThan(0);
    expect(fullNameMessage && fullNameMessage.length).toBeGreaterThan(0);
  });
});
