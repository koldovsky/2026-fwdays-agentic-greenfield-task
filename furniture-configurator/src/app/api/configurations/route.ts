import { NextRequest, NextResponse } from "next/server";
import { submitConfiguration, type ConfigurationInput } from "@/lib/server/configuratorService";
import { requireRole } from "@/lib/server/requireRole";

function parseConfigurationInput(body: unknown): ConfigurationInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const productTypeId = Number(b.productTypeId);
  const topSizeCm = Number(b.topSizeCm);
  const bottomSizeCm = Number(b.bottomSizeCm);
  const facadeColorId = Number(b.facadeColorId);
  const facadeMaterialId = Number(b.facadeMaterialId);
  const corpusMaterialId = Number(b.corpusMaterialId);
  const hardwareItemIds = Array.isArray(b.hardwareItemIds)
    ? b.hardwareItemIds.map(Number)
    : [];

  const values = [
    productTypeId,
    topSizeCm,
    bottomSizeCm,
    facadeColorId,
    facadeMaterialId,
    corpusMaterialId,
    ...hardwareItemIds,
  ];
  if (values.some((v) => !Number.isInteger(v))) return null;

  return {
    productTypeId,
    topSizeCm,
    bottomSizeCm,
    facadeColorId,
    facadeMaterialId,
    corpusMaterialId,
    hardwareItemIds,
  };
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["manager"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const input = parseConfigurationInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
  }

  const outcome = await submitConfiguration(input);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  return NextResponse.json(outcome.result);
}
