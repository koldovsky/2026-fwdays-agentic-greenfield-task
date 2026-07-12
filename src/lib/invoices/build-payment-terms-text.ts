import type { PaymentTermsText } from "@/lib/render/render-invoice";

function formatPaymentDeadlineEn(days: number): string {
  if (days === 1) {
    return "Payment within 1 day";
  }
  return `Payment within ${days} days`;
}

function formatPaymentDeadlineUa(days: number): string {
  if (days === 1) {
    return "Оплата протягом 1 дня";
  }
  return `Оплата протягом ${days} днів`;
}

function formatExecutionTermEn(days: number): string {
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    if (weeks === 1) {
      return "Execution within 1 week";
    }
    return `Execution within ${weeks} weeks`;
  }
  if (days === 1) {
    return "Execution within 1 day";
  }
  return `Execution within ${days} days`;
}

function formatExecutionTermUa(days: number): string {
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    if (weeks === 1) {
      return "Виконання протягом 1 тижня";
    }
    return `Виконання протягом ${weeks} тижнів`;
  }
  if (days === 1) {
    return "Виконання протягом 1 дня";
  }
  return `Виконання протягом ${days} днів`;
}

/** Builds bilingual payment-terms prose for the invoice template (design D8). */
export function buildPaymentTermsText(input: {
  prepaymentPercent: number;
  paymentDays: number;
  executionDays: number;
}): PaymentTermsText {
  const { prepaymentPercent, paymentDays, executionDays } = input;

  return {
    prepaymentEn: `Prepayment ${prepaymentPercent}%`,
    prepaymentUa: `Передоплата ${prepaymentPercent}%`,
    paymentDeadlineEn: formatPaymentDeadlineEn(paymentDays),
    paymentDeadlineUa: formatPaymentDeadlineUa(paymentDays),
    executionTermEn: formatExecutionTermEn(executionDays),
    executionTermUa: formatExecutionTermUa(executionDays),
    balanceEn: "Balance after delivery",
    balanceUa: "Залишок після передачі",
  };
}
