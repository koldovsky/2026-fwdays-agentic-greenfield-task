import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DimensionType } from "@/generated/prisma/client";
import { requireRole } from "@/lib/server/requireRole";

const DIMENSION_TYPES = Object.values(DimensionType);

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const standardSizes = await prisma.standardSize.findMany({
    orderBy: [{ dimensionType: "asc" }, { valueCm: "asc" }],
  });
  return NextResponse.json({ standardSizes });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const dimensionType = body?.dimensionType;
  const valueCm = Number(body?.valueCm);

  if (!DIMENSION_TYPES.includes(dimensionType)) {
    return NextResponse.json(
      { error: `dimensionType must be one of ${DIMENSION_TYPES.join(", ")}` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(valueCm) || valueCm <= 0) {
    return NextResponse.json({ error: "valueCm must be a positive integer" }, { status: 400 });
  }

  const existing = await prisma.standardSize.findUnique({
    where: { dimensionType_valueCm: { dimensionType, valueCm } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This standard size already exists", existing },
      { status: 409 },
    );
  }

  const standardSize = await prisma.standardSize.create({ data: { dimensionType, valueCm } });
  return NextResponse.json({ standardSize }, { status: 201 });
}
