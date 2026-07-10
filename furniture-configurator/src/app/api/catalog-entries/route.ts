import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeSkuSegment } from "@/lib/configurator/buildBOM";
import { findMatchingCatalogEntry } from "@/lib/configurator/findMatchingCatalogEntry";
import {
  getCatalogEntryRecords,
  resolveConfiguration,
} from "@/lib/server/configuratorService";
import { buildBOM } from "@/lib/configurator/buildBOM";
import { requireRole } from "@/lib/server/requireRole";

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const catalogEntries = await prisma.catalogEntry.findMany({
    include: {
      productType: true,
      facadeColor: true,
      facadeMaterial: true,
      corpusMaterial: true,
      hardwareOptions: { include: { hardwareItem: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ catalogEntries });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["manager"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const productTypeId = Number(b.productTypeId);
  const topSizeCm = Number(b.topSizeCm);
  const bottomSizeCm = Number(b.bottomSizeCm);
  const facadeColorId = Number(b.facadeColorId);
  const facadeMaterialId = Number(b.facadeMaterialId);
  const corpusMaterialId = Number(b.corpusMaterialId);
  const hardwareItemIds = Array.isArray(b.hardwareItemIds) ? b.hardwareItemIds.map(Number) : [];

  const values = [productTypeId, topSizeCm, bottomSizeCm, facadeColorId, facadeMaterialId, corpusMaterialId, ...hardwareItemIds];
  if (values.some((v) => !Number.isInteger(v))) {
    return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
  }

  const input = {
    productTypeId,
    topSizeCm,
    bottomSizeCm,
    facadeColorId,
    facadeMaterialId,
    corpusMaterialId,
    hardwareItemIds,
  };

  const resolved = await resolveConfiguration(input);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const bomResult = buildBOM(resolved.selection, resolved.partSpecs);
  if (!bomResult.valid) {
    return NextResponse.json({ error: "Configuration is not valid", errors: bomResult.errors }, { status: 400 });
  }

  const catalogEntries = await getCatalogEntryRecords(productTypeId);
  const existingMatch = findMatchingCatalogEntry(resolved.selection, catalogEntries);
  if (existingMatch) {
    return NextResponse.json(
      { error: "This combination already exists in the catalog", existingMatch },
      { status: 409 },
    );
  }

  const sku = `${sanitizeSkuSegment(resolved.selection.productTypeName)}-STD-${String(catalogEntries.length + 1).padStart(3, "0")}`;

  const catalogEntry = await prisma.catalogEntry.create({
    data: {
      sku,
      isStandard: true,
      productTypeId,
      topSizeCm,
      bottomSizeCm,
      facadeColorId,
      facadeMaterialId,
      corpusMaterialId,
      hardwareOptions: {
        create: hardwareItemIds.map((hardwareItemId) => ({ hardwareItemId })),
      },
    },
    include: { hardwareOptions: { include: { hardwareItem: true } } },
  });

  return NextResponse.json({ catalogEntry }, { status: 201 });
}
