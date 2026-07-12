import { z } from "zod";

import { centsFromInput } from "@/lib/invoice-calc/money";
import { isValidationError } from "@/lib/invoice-calc/validation";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PHONE_PATTERN = /^[\d+\s().-]{5,}$/;

const AMOUNT_EXAMPLE = "650 або 1,234.56";

const EMAIL_EXAMPLE = "billing@client.example";

const PHONE_EXAMPLE = "+380 44 123 4567";

const PREPAY_EXAMPLE = "50 або 50%";

/** Recognized short-format keys (FR-INPUT-02), lowercase aliases. */
const SHORT_FORMAT_KEY_MAP = {
  client: "customerName",
  addr: "customerAddress",
  email: "customerEmail",
  phone: "customerPhone",
  web: "customerWebsite",
  curr: "currency",
  service: "serviceText",
  qty: "quantity",
  amount: "unitPriceInput",
  prepay: "prepaymentPercent",
  pay_days: "paymentDays",
  exec_days: "executionDays",
} as const;

type ShortFormatField = (typeof SHORT_FORMAT_KEY_MAP)[keyof typeof SHORT_FORMAT_KEY_MAP];

export type ShortFormatPartial = Partial<
  Record<ShortFormatField, string | "USD" | "EUR">
>;

const currencySchema = z.enum(["USD", "EUR"], {
  error: `Валюта має бути USD або EUR. Приклад: USD`,
});

const quantitySchema = z
  .string()
  .trim()
  .min(1, "Вкажіть кількість. Приклад: 1")
  .refine((value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0;
  }, "Кількість має бути цілим числом більше нуля. Приклад: 2");

const amountSchema = z.string().trim().min(1, `Вкажіть суму. Приклад: ${AMOUNT_EXAMPLE}`).superRefine((value, ctx) => {
  const result = centsFromInput(value);
  if (isValidationError(result)) {
    ctx.addIssue({
      code: "custom",
      message: `Невірний формат суми. Приклад: ${AMOUNT_EXAMPLE}`,
    });
    return;
  }
  if (result <= 0) {
    ctx.addIssue({
      code: "custom",
      message: `Сума має бути більше нуля. Приклад: ${AMOUNT_EXAMPLE}`,
    });
  }
});

const prepaymentSchema = z
  .string()
  .trim()
  .min(1, `Вкажіть передоплату у відсотках. Приклад: ${PREPAY_EXAMPLE}`)
  .transform((value) => value.replace(/%$/, "").trim())
  .pipe(
    z
      .string()
      .refine((value) => {
        const parsed = Number.parseInt(value, 10);
        return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100;
      }, `Передоплата має бути від 0 до 100. Приклад: ${PREPAY_EXAMPLE}`)
  );

const dayCountSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Вкажіть ${label}. Приклад: 3`)
    .refine((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isSafeInteger(parsed) && parsed >= 0;
    }, `${label} має бути цілим невід'ємним числом. Приклад: 3`);

export const invoiceFormSchema = z.object({
  clientId: z.string(),
  customerName: z.string().trim().min(1, "Вкажіть ім'я або назву клієнта"),
  customerAddress: z.string().trim().min(1, "Вкажіть адресу клієнта"),
  customerEmail: z
    .string()
    .trim()
    .min(1, "Вкажіть email")
    .email(`Невірний email. Приклад: ${EMAIL_EXAMPLE}`),
  customerPhone: z
    .string()
    .trim()
    .min(1, "Вкажіть телефон")
    .regex(
      PHONE_PATTERN,
      `Невірний телефон. Приклад: ${PHONE_EXAMPLE}`
    ),
  customerWebsite: z.string(),
  currency: currencySchema,
  serviceText: z.string().trim().min(1, "Опишіть послугу, наприклад: логотип"),
  naceEntryId: z.string(),
  quantity: quantitySchema,
  unitPriceInput: amountSchema,
  prepaymentPercent: prepaymentSchema,
  paymentDays: dayCountSchema("термін оплати (днів)"),
  executionDays: dayCountSchema("термін виконання (днів)"),
  projectName: z.string(),
  issueDate: z
    .string()
    .trim()
    .regex(ISO_DATE_PATTERN, "Дата має бути у форматі YYYY-MM-DD"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export type ParsedInvoiceFormValues = InvoiceFormValues & {
  prepaymentPercentNumber: number;
  quantityNumber: number;
  paymentDaysNumber: number;
  executionDaysNumber: number;
};

export function parseInvoiceFormValues(
  values: InvoiceFormValues
): ParsedInvoiceFormValues | z.ZodError<InvoiceFormValues> {
  const parsed = invoiceFormSchema.safeParse(values);
  if (!parsed.success) {
    return parsed.error;
  }

  const data = parsed.data;
  return {
    ...data,
    prepaymentPercentNumber: Number.parseInt(data.prepaymentPercent, 10),
    quantityNumber: Number.parseInt(data.quantity, 10),
    paymentDaysNumber: Number.parseInt(data.paymentDays, 10),
    executionDaysNumber: Number.parseInt(data.executionDays, 10),
  };
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const emptyInvoiceFormValues = (): InvoiceFormValues => ({
  clientId: "",
  customerName: "",
  customerAddress: "",
  customerEmail: "",
  customerPhone: "",
  customerWebsite: "",
  currency: "USD",
  serviceText: "",
  naceEntryId: "",
  quantity: "1",
  unitPriceInput: "",
  prepaymentPercent: "50",
  paymentDays: "3",
  executionDays: "14",
  projectName: "",
  issueDate: todayIsoDate(),
});

function normalizeShortFormatKey(rawKey: string): keyof typeof SHORT_FORMAT_KEY_MAP | null {
  const key = rawKey.trim().toLowerCase();
  if (key in SHORT_FORMAT_KEY_MAP) {
    return key as keyof typeof SHORT_FORMAT_KEY_MAP;
  }
  return null;
}

function normalizeShortFormatValue(
  field: ShortFormatField,
  rawValue: string
): string | "USD" | "EUR" {
  const trimmed = rawValue.trim();
  if (field === "currency") {
    const upper = trimmed.toUpperCase();
    if (upper === "USD" || upper === "EUR") {
      return upper;
    }
    return trimmed;
  }
  if (field === "prepaymentPercent") {
    return trimmed.replace(/%$/, "").trim();
  }
  return trimmed;
}

/**
 * Parses FR-INPUT-02 short key-value lines (`key: value`). Unknown keys are
 * ignored; recognized keys populate the corresponding form fields.
 */
export function parseShortFormat(text: string): ShortFormatPartial {
  const result: ShortFormatPartial = {};

  for (const line of text.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const rawKey = trimmedLine.slice(0, separatorIndex);
    const rawValue = trimmedLine.slice(separatorIndex + 1);
    const mappedKey = normalizeShortFormatKey(rawKey);
    if (!mappedKey) {
      continue;
    }

    const field = SHORT_FORMAT_KEY_MAP[mappedKey];
    result[field] = normalizeShortFormatValue(field, rawValue);
  }

  return result;
}

export function mergeShortFormatIntoForm(
  current: InvoiceFormValues,
  partial: ShortFormatPartial
): InvoiceFormValues {
  const next: InvoiceFormValues = { ...current };

  for (const [key, value] of Object.entries(partial) as Array<
    [keyof ShortFormatPartial, string | "USD" | "EUR"]
  >) {
    if (value === undefined) {
      continue;
    }
    if (key === "currency") {
      if (value === "USD" || value === "EUR") {
        next.currency = value;
      }
      continue;
    }
    next[key] = value;
  }

  if (partial.customerName) {
    next.clientId = "";
  }
  if (partial.serviceText) {
    next.naceEntryId = "";
  }

  return next;
}

export const SHORT_FORMAT_EXAMPLE = `client: Acme Studio
addr: 10 Market St, San Francisco, CA
email: billing@acme.example
phone: +1 415 555 0100
web: acme.example
curr: USD
service: logo design
qty: 2
amount: 5525
prepay: 50%
pay_days: 3
exec_days: 14`;
