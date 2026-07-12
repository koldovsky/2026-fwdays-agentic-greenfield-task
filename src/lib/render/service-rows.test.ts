import { describe, expect, it } from "vitest";
import { toCents } from "@/lib/invoice-calc/money";
import type { LineItem } from "@/types/invoice";
import { TemplateRenderError } from "./fill-template";
import { buildProjectBlock, buildServiceRows } from "./service-rows";

function item(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: "line-1",
    descriptionEn: "Graphic design services",
    descriptionUa: "Послуги графічного дизайну",
    quantity: 1,
    unitPriceCents: toCents(123_456),
    ...overrides,
  };
}

// @trace FR-TPL-03
describe("buildServiceRows", () => {
  it("renders one row with bilingual text and formatted amounts", () => {
    const rows = buildServiceRows([item()]);

    expect(rows).toContain("<div>Graphic design services</div>");
    expect(rows).toContain("Послуги графічного дизайну");
    expect(rows).toContain("<td>1,234.56</td>");
    expect((rows.match(/<tr>/g) ?? []).length).toBe(1);
  });

  it("computes the line amount as unit price × quantity", () => {
    const rows = buildServiceRows([
      item({ quantity: 3, unitPriceCents: toCents(50_000) }),
    ]);

    // unit price 500.00 × 3 = 1,500.00
    expect(rows).toContain("<td>500.00</td>");
    expect(rows).toContain("<td>1,500.00</td>");
  });

  it("renders one numbered row per item, in the supplied order", () => {
    const rows = buildServiceRows([
      item({ id: "a", descriptionEn: "First" }),
      item({ id: "b", descriptionEn: "Second" }),
    ]);

    expect((rows.match(/<tr>/g) ?? []).length).toBe(2);
    expect(rows.indexOf("First")).toBeLessThan(rows.indexOf("Second"));
    expect(rows).toContain("<td>1</td>");
    expect(rows).toContain("<td>2</td>");
  });

  it("escapes hostile descriptions", () => {
    const rows = buildServiceRows([
      item({ descriptionEn: "<img src=x onerror=alert(1)>" }),
    ]);

    expect(rows).not.toContain("<img");
    expect(rows).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("throws when there are no line items", () => {
    expect(() => buildServiceRows([])).toThrowError(TemplateRenderError);
  });
});

// @trace FR-TPL-04
describe("buildProjectBlock", () => {
  it("renders a labelled block when a project name is supplied", () => {
    const block = buildProjectBlock("Rebrand 2026");

    expect(block).toContain("Rebrand 2026");
    expect(block).toContain("Project / Проєкт:");
  });

  it("escapes the project name", () => {
    expect(buildProjectBlock('"><script>x</script>')).not.toContain("<script>");
  });

  it("returns an empty string when absent or blank", () => {
    expect(buildProjectBlock()).toBe("");
    expect(buildProjectBlock("   ")).toBe("");
  });
});
