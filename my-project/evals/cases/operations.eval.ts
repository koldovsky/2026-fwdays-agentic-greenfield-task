import { stockAlert } from "../../lib/dashboard";
import { addSupplier } from "../../lib/master-data";
import { seedData } from "../../lib/seed";
import { captureError, type EvalCase } from "./types";

export const cases: EvalCase[] = [
  {
    id: "eval-dashboard-critical-stock-label",
    trace: ["FR-11", "FR-12", "NFR-7", "NFR-10"],
    dimension: "status-clarity",
    capability: "dashboard-shell",
    scenario: "Матеріал має нульовий залишок і повинен бути зрозумілим без покладання лише на колір.",
    produce: async () => ({ quantity: 0, reorderLevel: 20, visibleLabel: stockAlert(0, 20) }),
    rubric: [
      "CRITICAL: результат містить текстовий статус, а не лише назву кольору або CSS-клас",
      "CRITICAL: нульовий залишок названо критичним",
      "статус сформульовано короткою зрозумілою українською фразою",
    ],
  },
  {
    id: "eval-master-data-invalid-rating",
    trace: ["FR-14", "NFR-3", "NFR-7"],
    dimension: "error-clarity",
    capability: "master-data",
    scenario: "Адміністратор задає постачальнику рейтинг 6 за п’ятибальною шкалою.",
    produce: () => captureError(() => addSupplier(seedData, { ...seedData.suppliers[0], supplierId: "sup_eval", rating: 6 })),
    rubric: [
      "CRITICAL: повідомлення називає поле «рейтинг»",
      "CRITICAL: повідомлення вказує допустимий діапазон від 0 до 5",
      "результат не містить generic 500 або внутрішніх деталей",
    ],
  },
];

// @trace FR-11, FR-12, FR-14, NFR-3, NFR-7, NFR-10
