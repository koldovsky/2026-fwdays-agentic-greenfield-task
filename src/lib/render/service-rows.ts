import { formatAmount, lineAmount } from "@/lib/invoice-calc/money";
import type { LineItem } from "@/types/invoice";
import { escapeHtml, TemplateRenderError } from "./fill-template";

const SUB_LABEL_STYLE = 'font-size: 8px; color: var(--gray-dark);';

/**
 * Expands `{{SERVICE_ROWS}}` into one table row per line item (FR-TPL-03):
 * index, bilingual description, quantity, unit price, and line amount
 * (unit price × quantity), amounts formatted as `1,234.56`.
 *
 * Every interpolated value is escaped; the returned markup is the only raw
 * HTML this builder contributes.
 */
export function buildServiceRows(lineItems: readonly LineItem[]): string {
  if (lineItems.length === 0) {
    throw new TemplateRenderError(
      "An invoice must list at least one service line item"
    );
  }

  return lineItems
    .map((item, index) => {
      const amount = lineAmount(item.unitPriceCents, item.quantity);

      return [
        "<tr>",
        `<td>${index + 1}</td>`,
        "<td>",
        `<div>${escapeHtml(item.descriptionEn)}</div>`,
        `<div style="${SUB_LABEL_STYLE}">${escapeHtml(item.descriptionUa)}</div>`,
        "</td>",
        `<td>${escapeHtml(String(item.quantity))}</td>`,
        `<td>${escapeHtml(formatAmount(item.unitPriceCents))}</td>`,
        `<td>${escapeHtml(formatAmount(amount))}</td>`,
        "</tr>",
      ].join("");
    })
    .join("\n");
}

/**
 * Renders the optional `{{PROJECT_BLOCK}}` (FR-TPL-04): a labelled customer
 * detail line, or an empty string when no project name is supplied — no empty
 * markup wrapper is left behind.
 */
export function buildProjectBlock(projectName?: string): string {
  const name = projectName?.trim() ?? "";

  if (name.length === 0) {
    return "";
  }

  return `<div class="customer-detail">Project / Проєкт: ${escapeHtml(name)}</div>`;
}
