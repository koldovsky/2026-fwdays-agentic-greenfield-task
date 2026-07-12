import { buildSupplierBlock } from "@/lib/banking/supplier-block";
import { renderDateEn, renderDateUa } from "@/lib/invoice-calc/dates";
import {
  DEFAULT_PREPAYMENT_PERCENT,
  formatAmount,
  invoiceTotal,
  lineAmount,
  prepaymentSplit,
} from "@/lib/invoice-calc/money";
import { paymentPurpose } from "@/lib/invoice-calc/purpose";
import { clientToInvoiceCustomerFields } from "@/lib/storage/clients";
import type { Client } from "@/types/client";
import type { Currency, LineItem } from "@/types/invoice";
import type { SupplierProfile } from "@/types/supplier";
import { fillTemplate, type RenderVars } from "./fill-template";
import { buildProjectBlock, buildServiceRows } from "./service-rows";
import { INVOICE_TEMPLATE } from "./template";

/** Bilingual prose for the payment-terms table. Wording is owned by form-input (S4). */
export interface PaymentTermsText {
  readonly prepaymentEn: string;
  readonly prepaymentUa: string;
  readonly paymentDeadlineEn: string;
  readonly paymentDeadlineUa: string;
  readonly executionTermEn: string;
  readonly executionTermUa: string;
  readonly balanceEn: string;
  readonly balanceUa: string;
}

export interface RenderInvoiceInput {
  /** Sequential `YYYY-NNN`, assigned on issue (FR-CALC-01). */
  readonly invoiceNumber: string;
  /** ISO `YYYY-MM-DD` issue date. */
  readonly issueDate: string;
  readonly currency: Currency;
  readonly lineItems: readonly LineItem[];
  readonly supplier: SupplierProfile;
  readonly client: Client;
  readonly place: { readonly en: string; readonly ua: string };
  readonly signatory: { readonly en: string; readonly ua: string };
  readonly paymentTerms: PaymentTermsText;
  /** 0–100; defaults to 50 (FR-CALC-04). */
  readonly prepaymentPercent?: number;
  readonly projectName?: string;
  /** Override the template source; defaults to the generated constant. */
  readonly template?: string;
}

/**
 * Renders a self-contained bilingual invoice document (FR-TPL-01…05).
 *
 * The single composition point: callers never assemble RenderVars by hand.
 * `MissingIbanError` from banking propagates unchanged so the form can show
 * its BC-UX-01 message.
 */
export function renderInvoice(input: RenderInvoiceInput): string {
  const amounts = input.lineItems.map((item: LineItem) =>
    lineAmount(item.unitPriceCents, item.quantity)
  );
  const total = invoiceTotal(amounts);
  const percent = input.prepaymentPercent ?? DEFAULT_PREPAYMENT_PERCENT;
  const { prepayment, balance } = prepaymentSplit(total, percent);

  const dateEn = renderDateEn(input.issueDate);
  const dateUa = renderDateUa(input.issueDate);
  const supplierBlock = buildSupplierBlock(input.supplier, input.currency);
  const customer = clientToInvoiceCustomerFields(input.client);

  const vars: RenderVars = {
    ...supplierBlock,
    CURRENCY: input.currency,
    INVOICE_NUMBER: input.invoiceNumber,
    INVOICE_DATE_EN: dateEn,
    INVOICE_DATE_UA: dateUa,
    PLACE_EN: input.place.en,
    PLACE_UA: input.place.ua,
    CUSTOMER_NAME: customer.customerName,
    CUSTOMER_ADDRESS_1: customer.customerAddress1,
    CUSTOMER_EMAIL: customer.customerEmail,
    CUSTOMER_PHONE: customer.customerPhone,
    CUSTOMER_WEBSITE: customer.customerWebsite,
    PROJECT_BLOCK: buildProjectBlock(input.projectName),
    SERVICE_ROWS: buildServiceRows(input.lineItems),
    TOTAL_AMOUNT: formatAmount(total),
    PREPAYMENT_AMOUNT: formatAmount(prepayment),
    REMAINING_AMOUNT: formatAmount(balance),
    PREPAYMENT_TEXT_EN: input.paymentTerms.prepaymentEn,
    PREPAYMENT_TEXT_UA: input.paymentTerms.prepaymentUa,
    PAYMENT_DEADLINE_TEXT_EN: input.paymentTerms.paymentDeadlineEn,
    PAYMENT_DEADLINE_TEXT_UA: input.paymentTerms.paymentDeadlineUa,
    EXECUTION_TERM_TEXT_EN: input.paymentTerms.executionTermEn,
    EXECUTION_TERM_TEXT_UA: input.paymentTerms.executionTermUa,
    BALANCE_TEXT_EN: input.paymentTerms.balanceEn,
    BALANCE_TEXT_UA: input.paymentTerms.balanceUa,
    PAYMENT_DETAILS: paymentPurpose(input.invoiceNumber, dateEn),
    SIGNATORY_EN: input.signatory.en,
    SIGNATORY_UA: input.signatory.ua,
  };

  return fillTemplate(input.template ?? INVOICE_TEMPLATE, vars);
}
