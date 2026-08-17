import {
  amountToCursive,
  dateToCursive,
  dateToNumeric,
} from "../locale-helpers";
import type {
  ContactRef,
  DocumentSession,
  ServiceLine,
} from "../document-session/types";
import {
  computePriceTotal,
  formatMoney,
  sessionDateForHelpers,
} from "./format";

const CONTACT_FIELDS = [
  "full-name",
  "inn",
  "phone",
  "acc",
  "bank",
  "mfo-bank",
  "addr",
] as const;

function contactValues(
  prefix: "client" | "done-by",
  contact: ContactRef | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of CONTACT_FIELDS) {
    out[`${prefix}-${field}`] = contact?.[field] ?? "";
  }
  out[`${prefix}-sign-name`] = contact?.["full-name"] ?? "";
  return out;
}

/** Flat document-level anchor → string map (not per-row). */
export function buildDocumentValueMap(
  session: DocumentSession,
): Record<string, string> {
  const total = computePriceTotal(session.services);
  const dateInput = sessionDateForHelpers(session.date);
  const dateNumeric = dateToNumeric(dateInput);
  const dateCursive = dateToCursive(dateInput);
  const amountCursive = amountToCursive(total);
  const priceTotalDisplay = formatMoney(total);
  const serviceCursive = session.services
    .map((s) => s["service-name"])
    .filter(Boolean)
    .join("; ");

  return {
    ...contactValues("client", session.client),
    ...contactValues("done-by", session["done-by"]),
    "doc-number": session["invoice-number"] ?? "",
    "complete-doc-number": session["act-number"] ?? "",
    date: dateNumeric,
    "date-cursive": dateCursive,
    "data-cursive": dateCursive,
    "price-total": priceTotalDisplay,
    "amount-total": priceTotalDisplay,
    "amount-cursive": amountCursive,
    "amount-total-cursive": amountCursive,
    "service-cursive": serviceCursive,
  };
}

export type RowValues = {
  "service-name": string;
  price: string;
  "amount-item": string;
  done_amount: string;
  qty: string;
  "line-sum": string;
};

export function buildRowValues(line: ServiceLine): RowValues {
  const lineSum = line.amount * line.price;
  const qtyDisplay = Number.isInteger(line.amount)
    ? String(line.amount)
    : formatMoney(line.amount);
  const priceDisplay = formatMoney(line.price);
  const sumDisplay = formatMoney(lineSum);

  return {
    "service-name": line["service-name"],
    price: priceDisplay,
    "amount-item": priceDisplay,
    done_amount: qtyDisplay,
    qty: qtyDisplay,
    "line-sum": sumDisplay,
  };
}
