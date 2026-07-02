import { createOrder, receiveOrder } from "../../lib/procurement";
import { seedData } from "../../lib/seed";
import { captureError, type EvalCase } from "./types";

export const cases: EvalCase[] = [
  {
    id: "eval-procurement-excess-receipt",
    trace: ["FR-21", "NFR-3", "NFR-7"],
    dimension: "error-clarity",
    capability: "procurement-receiving",
    scenario: "Оператор намагається оприбуткувати 51 одиницю, коли залишок замовлення становить 50.",
    produce: () => captureError(() => receiveOrder(seedData, "po_502", 51, "usr_001")),
    rubric: [
      "CRITICAL: повернено конкретне доменне повідомлення, а не generic 500",
      "CRITICAL: повідомлення містить фактичний доступний залишок 50",
      "повідомлення пояснює, що введена кількість перевищує залишок",
      "у повідомленні немає stack trace або внутрішніх шляхів",
    ],
  },
  {
    id: "eval-procurement-invalid-reference",
    trace: ["FR-18", "FR-39", "NFR-3"],
    dimension: "error-clarity",
    capability: "procurement-receiving",
    scenario: "Оператор створює замовлення з неіснуючим постачальником.",
    produce: () => captureError(() => createOrder(seedData, "missing", "mat_201", 1, 10)),
    rubric: [
      "CRITICAL: помилка називає некоректну сутність — постачальника",
      "CRITICAL: результат не містить generic 500 або технічних деталей",
      "формулювання підказує вибрати коректного постачальника",
    ],
  },
];

// @trace FR-18, FR-21, FR-39, NFR-3, NFR-7
