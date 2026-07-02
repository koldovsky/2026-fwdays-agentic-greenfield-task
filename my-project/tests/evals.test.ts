import { describe, expect, it } from "vitest";
import { cases as manufacturingCases } from "@/evals/cases/manufacturing.eval";
import { cases as operationsCases } from "@/evals/cases/operations.eval";
import { cases as procurementCases } from "@/evals/cases/procurement.eval";

const cases = [...procurementCases, ...manufacturingCases, ...operationsCases];

describe("output eval cases", () => {
  // @trace NFR-3 NFR-7 NFR-10
  it("uses unique ForgeFlow ids, real capabilities, traces, and gating rubrics", () => {
    expect(cases).toHaveLength(6);
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);
    expect(cases.every((item) => item.capability !== "sample" && item.trace.length > 0)).toBe(true);
    expect(cases.every((item) => item.rubric.some((criterion) => criterion.startsWith("CRITICAL:")))).toBe(true);
  });

  // @trace FR-11 FR-12 FR-14 FR-18 FR-21 FR-31 FR-34 FR-39
  it("executes every case against current domain logic and produces evidence", async () => {
    const outputs = await Promise.all(cases.map((item) => item.produce()));
    expect(outputs).toEqual([
      { error: "Кількість перевищує залишок до отримання: 50.", generic500: false },
      { error: "Оберіть коректного постачальника.", generic500: false },
      { validationMessage: "Промислова поліуретанова смола — на контролі якості." },
      { validationMessage: "Не вистачає 14.00 кг матеріалу «Загартований сталевий прут 20 мм»." },
      { quantity: 0, reorderLevel: 20, visibleLabel: "Критичний запас" },
      { error: "Рейтинг має бути від 0 до 5.", generic500: false },
    ]);
  });
});

// @trace FR-11, FR-12, FR-14, FR-18, FR-21, FR-31, FR-34, FR-39, NFR-3, NFR-7, NFR-10
