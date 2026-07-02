import { validateProduction } from "../../lib/manufacturing";
import { seedData } from "../../lib/seed";
import type { EvalCase } from "./types";

export const cases: EvalCase[] = [
  {
    id: "eval-manufacturing-quality-hold",
    trace: ["FR-31", "FR-34", "NFR-3", "NFR-7"],
    dimension: "decision-clarity",
    capability: "manufacturing",
    scenario: "Оператор планує випуск, але один із компонентів перебуває на контролі якості.",
    produce: async () => ({ validationMessage: validateProduction(seedData, "prd_301", 10) }),
    rubric: [
      "CRITICAL: повідомлення називає конкретний матеріал, що блокує запуск",
      "CRITICAL: повідомлення явно зазначає стан «на контролі якості»",
      "повідомлення коротке й придатне для прийняття операційного рішення",
      "у повідомленні немає внутрішніх кодів stockType",
    ],
  },
  {
    id: "eval-manufacturing-shortage",
    trace: ["FR-31", "FR-34", "NFR-3"],
    dimension: "decision-clarity",
    capability: "manufacturing",
    scenario: "Для виробничого запуску бракує 14 кг сталевого прута.",
    produce: async () => {
      const data = structuredClone(seedData);
      data.rawMaterials.forEach((item) => { item.stockType = "unrestricted"; });
      data.rawMaterials[0].quantityInStock = 1;
      return { validationMessage: validateProduction(data, "prd_301", 10) };
    },
    rubric: [
      "CRITICAL: повідомлення називає конкретний дефіцитний матеріал",
      "CRITICAL: повідомлення містить числовий дефіцит 14.00 кг",
      "формулювання пояснює причину блокування без технічного жаргону",
    ],
  },
];

// @trace FR-31, FR-34, NFR-3, NFR-7
