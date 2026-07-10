import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { NIGHTSTAND_PRODUCT_TYPE_NAME } from "@/lib/constants";

describe("POST /api/configurations (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seededRefs() {
    const [productType, color, mdf, ldsp] = await Promise.all([
      prisma.productType.findUniqueOrThrow({ where: { name: NIGHTSTAND_PRODUCT_TYPE_NAME } }),
      prisma.color.findUniqueOrThrow({ where: { name: "Кашемір" } }),
      prisma.material.findUniqueOrThrow({ where: { name: "МДФ" } }),
      prisma.material.findUniqueOrThrow({ where: { name: "ЛДСП" } }),
    ]);
    const hardwareItems = await prisma.hardwareItem.findMany();
    return { productType, color, mdf, ldsp, hardwareItems };
  }

  it("returns a valid BOM matching the standard catalog entry", async () => {
    const { productType, color, mdf, ldsp, hardwareItems } = await seededRefs();

    const request = new NextRequest("http://localhost/api/configurations", {
      method: "POST",
      headers: { Cookie: "fc_session=manager" },
      body: JSON.stringify({
        productTypeId: productType.id,
        topSizeCm: 60,
        bottomSizeCm: 60,
        facadeColorId: color.id,
        facadeMaterialId: mdf.id,
        corpusMaterialId: ldsp.id,
        hardwareItemIds: hardwareItems.map((h) => h.id),
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.bomResult.valid).toBe(true);
    expect(json.isStandard).toBe(true);
    expect(json.matchingEntry?.sku).toBe("TUMBA-STD-001");
    expect(json.bomResult.bom.map((c: { partRole: string }) => c.partRole)).toContain("HARDWARE");
  });

  it("blocks BOM generation and returns errors for an out-of-range custom size", async () => {
    const { productType, color, mdf, ldsp } = await seededRefs();

    const request = new NextRequest("http://localhost/api/configurations", {
      method: "POST",
      headers: { Cookie: "fc_session=manager" },
      body: JSON.stringify({
        productTypeId: productType.id,
        topSizeCm: 15,
        bottomSizeCm: 60,
        facadeColorId: color.id,
        facadeMaterialId: mdf.id,
        corpusMaterialId: ldsp.id,
        hardwareItemIds: [],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.bomResult.valid).toBe(false);
    expect(json.bomResult.errors[0].partRole).toBe("TOP");
  });

  it("marks a valid custom-size combination as a new individual combination", async () => {
    const { productType, color, mdf, ldsp } = await seededRefs();

    const request = new NextRequest("http://localhost/api/configurations", {
      method: "POST",
      headers: { Cookie: "fc_session=manager" },
      body: JSON.stringify({
        productTypeId: productType.id,
        topSizeCm: 45,
        bottomSizeCm: 45,
        facadeColorId: color.id,
        facadeMaterialId: mdf.id,
        corpusMaterialId: ldsp.id,
        hardwareItemIds: [],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.bomResult.valid).toBe(true);
    expect(json.isStandard).toBe(false);
    expect(json.matchingEntry).toBeNull();
  });
});
