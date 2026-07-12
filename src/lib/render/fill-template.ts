/**
 * Template fill engine (FR-TPL-01).
 *
 * Escape-by-default: every text value is HTML-escaped on the way in. Only the
 * two fragment keys in RAW_HTML_KEYS carry markup, and they are produced by
 * this capability's own builders, which escape their inputs. The fill step is
 * the single choke point every value passes through, so escaping lives here
 * rather than at each call site.
 */

/** Thrown when the supplied variables and the template disagree. */
export class TemplateRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateRenderError";
  }
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

/** Escapes the five HTML metacharacters. No sanitizer dependency (TC-STACK-03). */
export function escapeHtml(value: string): string {
  return value.replace(
    HTML_ESCAPE_PATTERN,
    (character) => HTML_ESCAPES[character] ?? character
  );
}

/**
 * Every `{{PLACEHOLDER}}` in docs/invoice-template.html. The drift test
 * asserts this tuple equals the placeholder set parsed from the template.
 */
export const TEMPLATE_KEYS = [
  "BALANCE_TEXT_EN",
  "BALANCE_TEXT_UA",
  "CURRENCY",
  "CUSTOMER_ADDRESS_1",
  "CUSTOMER_EMAIL",
  "CUSTOMER_NAME",
  "CUSTOMER_PHONE",
  "CUSTOMER_WEBSITE",
  "EXECUTION_TERM_TEXT_EN",
  "EXECUTION_TERM_TEXT_UA",
  "INVOICE_DATE_EN",
  "INVOICE_DATE_UA",
  "INVOICE_NUMBER",
  "PAYMENT_DEADLINE_TEXT_EN",
  "PAYMENT_DEADLINE_TEXT_UA",
  "PAYMENT_DETAILS",
  "PLACE_EN",
  "PLACE_UA",
  "PREPAYMENT_AMOUNT",
  "PREPAYMENT_TEXT_EN",
  "PREPAYMENT_TEXT_UA",
  "PROJECT_BLOCK",
  "REMAINING_AMOUNT",
  "SERVICE_ROWS",
  "SIGNATORY_EN",
  "SIGNATORY_UA",
  "SUPPLIER_ADDRESS_EN",
  "SUPPLIER_ADDRESS_UA",
  "SUPPLIER_BANK",
  "SUPPLIER_IBAN",
  "SUPPLIER_NAME_EN",
  "SUPPLIER_NAME_UA",
  "SUPPLIER_SWIFT",
  "SUPPLIER_TAX_ID",
  "TOTAL_AMOUNT",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type RenderVars = Readonly<Record<TemplateKey, string>>;

/** Fragments inserted verbatim; their builders escape every interpolated value. */
export const RAW_HTML_KEYS = ["PROJECT_BLOCK", "SERVICE_ROWS"] as const;

const RAW_HTML_KEY_SET: ReadonlySet<string> = new Set(RAW_HTML_KEYS);
const TEMPLATE_KEY_SET: ReadonlySet<string> = new Set(TEMPLATE_KEYS);

function assertKnownVariables(vars: RenderVars): void {
  const unknown = Object.keys(vars).filter((key) => !TEMPLATE_KEY_SET.has(key));

  if (unknown.length > 0) {
    throw new TemplateRenderError(
      `Unknown template variables supplied: ${unknown.sort().join(", ")}`
    );
  }
}

/**
 * Replaces every `{{VARIABLE}}` in one pass (FR-TPL-01). Single-pass matters:
 * a substituted value that itself contains `{{OTHER}}` is never re-expanded,
 * so data can never reach the template grammar.
 *
 * Fails closed — a placeholder without a value, or a value without a
 * placeholder, raises TemplateRenderError instead of emitting a document.
 */
export function fillTemplate(template: string, vars: RenderVars): string {
  assertKnownVariables(vars);

  const missing = new Set<string>();

  const output = template.replace(PLACEHOLDER_PATTERN, (token, name: string) => {
    const value = vars[name as TemplateKey];

    if (typeof value !== "string") {
      missing.add(name);
      return token;
    }

    return RAW_HTML_KEY_SET.has(name) ? value : escapeHtml(value);
  });

  if (missing.size > 0) {
    throw new TemplateRenderError(
      `Missing values for template placeholders: ${[...missing].sort().join(", ")}`
    );
  }

  return output;
}
