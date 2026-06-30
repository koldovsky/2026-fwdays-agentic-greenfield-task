import { describe, expect, it } from "vitest";
import { uk } from "./uk";

/** Recursively collect every string leaf in the table. */
function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(flattenStrings);
  }
  return [];
}

/** @trace FR-I18N-01 */
describe("uk i18n table — centralisation", () => {
  it("has no empty leaves", () => {
    for (const s of flattenStrings(uk)) {
      expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("exposes the shell, rates, picker, converter, and meta groups", () => {
    expect(uk.shell).toBeDefined();
    expect(uk.rates).toBeDefined();
    expect(uk.picker).toBeDefined();
    expect(uk.converter).toBeDefined();
    expect(uk.meta).toBeDefined();
  });
});

/** @trace FR-I18N-01 BC-BRAND-01 */
describe("uk i18n table — brand voice", () => {
  it("contains no exclamation marks anywhere", () => {
    for (const s of flattenStrings(uk)) {
      expect(s).not.toMatch(/!/);
    }
  });

  it("locks the brand lockup strings exactly", () => {
    expect(uk.shell.brandTitle).toBe("Гривня");
    expect(uk.shell.brandSubtitle).toBe("Офіційний курс НБУ");
  });

  it("locks the footer provenance line exactly", () => {
    expect(uk.shell.footerProvenance).toBe(
      "Дані: відкритий API НБУ · без кук і трекерів",
    );
  });
});

/** @trace FR-I18N-01 */
describe("uk i18n table — shared column labels", () => {
  it("defines each column label once, reused by shell and page", () => {
    expect(uk.shell.ratesColumnLabel).toBe("Список курсів");
    expect(uk.shell.focusColumnLabel).toBe("Обрана валюта");
  });
});

/** @trace FR-RATES-05 BC-HONESTY-01 */
describe("uk i18n table — rates error/empty copy", () => {
  it("locks the load-error and retry strings exactly", () => {
    expect(uk.rates.loadError).toBe(
      "Не вдалося завантажити курс. Спробуйте ще раз.",
    );
    expect(uk.rates.retry).toBe("Спробувати ще раз");
  });
});

/** @trace FR-PICK-02 */
describe("uk i18n table — picker copy", () => {
  it("locks the exact spec wording for no match", () => {
    expect(uk.picker.noMatch).toBe("Нічого не знайдено");
  });
});
