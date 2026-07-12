import { describe, expect, it } from "vitest";
import { MissingIbanError } from "@/lib/banking/supplier-block";
import { toCents } from "@/lib/invoice-calc/money";
import type { Client } from "@/types/client";
import type { SupplierProfile } from "@/types/supplier";
import { type RenderInvoiceInput, renderInvoice } from "./render-invoice";
import { INVOICE_TEMPLATE } from "./template";

const PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;
const TERMS_START = "<!-- TERMS AND CONDITIONS SECTION (FIXED — never modify) -->";
const TERMS_END = "<!-- SIGNATURE SECTION (FIXED) -->";
const TITLE_MARKUP = '<div class="invoice-title">INVOICE / РАХУНОК</div>';
const SUBTITLE_MARKUP =
  '<div class="invoice-subtitle">Graphic Design Service</div>';
const EXTERNAL_URL_PATTERN = /https?:\/\/[^'"\s)]+/g;
const MAX_RENDER_MS = 200;

// Synthetic fixtures: documentation bank code, sequential account bodies.
const SUPPLIER: SupplierProfile = {
  id: "profile-1",
  label: "Основний",
  nameEn: "Taras Shevchenko, Private Entrepreneur",
  nameUa: "ФОП Шевченко Тарас Григорович",
  addressEn: "1 Khreshchatyk St, Kyiv, 01001, Ukraine",
  addressUa: "вул. Хрещатик, 1, Київ, 01001, Україна",
  taxId: "1234567890",
  bankName: "JSC Universal Bank",
  swift: "UNJSUAUKXXX",
  ibanUsd: "UA003996220000000000000000001",
  ibanEur: "UA003996220000000000000000002",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

const CLIENT: Client = {
  id: "client-1",
  name: "Acme Studio",
  address: "10 Market St, San Francisco, CA 94103, USA",
  email: "billing@acme.example",
  phone: "+1 415 555 0100",
  website: "acme.example",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

function input(overrides: Partial<RenderInvoiceInput> = {}): RenderInvoiceInput {
  return {
    invoiceNumber: "2026-001",
    issueDate: "2026-05-03",
    currency: "USD",
    lineItems: [
      {
        id: "line-1",
        descriptionEn: "Graphic design services",
        descriptionUa: "Послуги графічного дизайну",
        quantity: 2,
        unitPriceCents: toCents(552_500),
      },
    ],
    supplier: SUPPLIER,
    client: CLIENT,
    place: { en: "Kyiv, Ukraine", ua: "Київ, Україна" },
    signatory: { en: "T. Shevchenko", ua: "Т. Шевченко" },
    paymentTerms: {
      prepaymentEn: "Prepayment 50%",
      prepaymentUa: "Передоплата 50%",
      paymentDeadlineEn: "Payment within 3 days",
      paymentDeadlineUa: "Оплата протягом 3 днів",
      executionTermEn: "Execution within 2 weeks",
      executionTermUa: "Виконання протягом 2 тижнів",
      balanceEn: "Balance after delivery",
      balanceUa: "Залишок після передачі",
    },
    ...overrides,
  };
}

function section(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end);

  if (from === -1 || to <= from) {
    throw new Error(`Section markers not found or out of order: ${start}`);
  }

  return html.slice(from, to);
}

describe("renderInvoice", () => {
  it("leaves no unreplaced placeholders (FR-TPL-01)", () => {
    expect(renderInvoice(input())).not.toMatch(PLACEHOLDER_PATTERN);
  });

  it("renders computed money values (FR-CALC-03, FR-CALC-04)", () => {
    const html = renderInvoice(input());

    // 5,525.00 × 2 = 11,050.00 total; 50% prepayment → 5,525.00 each side.
    expect(html).toContain("11,050.00");
    expect(html).toContain("5,525.00");
  });

  it("renders bilingual dates and the payment purpose (FR-CALC-02, FR-CALC-06)", () => {
    const html = renderInvoice(input());

    expect(html).toContain("May 03, 2026");
    expect(html).toContain("03.05.2026");
    expect(html).toContain("Payment by the invoice №2026-001 from May 03, 2026");
  });

  it("selects the currency IBAN from the supplier profile (FR-BANK-01)", () => {
    expect(renderInvoice(input())).toContain(SUPPLIER.ibanUsd);
    expect(renderInvoice(input({ currency: "EUR" }))).toContain(SUPPLIER.ibanEur);
  });

  it("propagates MissingIbanError unchanged (BC-UX-01)", () => {
    const noEur = { ...SUPPLIER, ibanEur: "" };

    expect(() =>
      renderInvoice(input({ currency: "EUR", supplier: noEur }))
    ).toThrowError(MissingIbanError);
  });

  it("keeps the TERMS block byte-identical to the template (BC-LEGAL-01)", () => {
    const rendered = section(renderInvoice(input()), TERMS_START, TERMS_END);
    const source = section(INVOICE_TEMPLATE, TERMS_START, TERMS_END);

    expect(rendered).toBe(source);
  });

  // @trace FR-TPL-02
  it("keeps the placeholder-free title and subtitle byte-identical (FR-TPL-02)", () => {
    const html = renderInvoice(input());

    for (const line of [TITLE_MARKUP, SUBTITLE_MARKUP]) {
      expect(INVOICE_TEMPLATE).toContain(line);
      expect(html).toContain(line);
    }
  });

  // @trace FR-TPL-02
  it("preserves the fixed signature markup, substituting only the names (FR-TPL-02)", () => {
    const html = renderInvoice(input());

    expect(html).toContain('<div class="signature-line"></div>');
    expect(html).toContain('<div class="signature-caption">signature / підпис</div>');
    expect(html).toContain(
      '<div class="signature-name">T. Shevchenko / Т. Шевченко</div>'
    );
  });

  // @trace FR-TPL-05
  it("embeds its CSS and A4 print rules (FR-TPL-05)", () => {
    const html = renderInvoice(input());

    expect(html).toContain("<style>");
    expect(html).toContain("@page");
  });

  // @trace FR-TPL-05
  it("has no external network reference at all (FR-TPL-05)", () => {
    const html = renderInvoice(input());

    expect(html.match(EXTERNAL_URL_PATTERN) ?? []).toHaveLength(0);
  });

  // @trace FR-TPL-05
  it("embeds the three Inter subsets as data URIs (FR-TPL-05)", () => {
    const html = renderInvoice(input());

    expect((html.match(/@font-face/g) ?? []).length).toBe(3);
    expect((html.match(/src: url\(data:font\/woff2;base64,/g) ?? []).length).toBe(
      3
    );
    // Variable files span the template's weights, including the 800 title.
    expect(html).toContain("font-weight: 300 800;");
  });

  // @trace FR-TPL-05
  it("keeps the Cyrillic subset that owns № (U+2116), used by English invoices", () => {
    const html = renderInvoice(input());

    expect(html).toContain("U+2116");
    // Ukrainian ґ lives in the same subset.
    expect(html).toContain("U+0490-0491");
    expect(html).toContain("Payment by the invoice №2026-001");
  });

  it("escapes hostile customer data (carried-forward security finding)", () => {
    const hostile: Client = { ...CLIENT, name: "<script>alert(1)</script>" };
    const html = renderInvoice(input({ client: hostile }));

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  // @trace FR-TPL-04
  it("omits the project block when no project is supplied (FR-TPL-04)", () => {
    expect(renderInvoice(input())).not.toContain("Project / Проєкт:");
    expect(renderInvoice(input({ projectName: "Rebrand 2026" }))).toContain(
      "Project / Проєкт: Rebrand 2026"
    );
  });

  it("renders a single invoice in under 200 ms (NFR-PERF-02)", () => {
    const started = performance.now();
    renderInvoice(input());
    expect(performance.now() - started).toBeLessThan(MAX_RENDER_MS);
  });
});
