import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/requireRole";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const partSpecId = Number(id);
  if (!Number.isInteger(partSpecId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const data: { allowsCustomSize?: boolean; minCm?: number | null; maxCm?: number | null } = {};
  if (typeof body?.allowsCustomSize === "boolean") {
    data.allowsCustomSize = body.allowsCustomSize;
  }
  if (body?.minCm === null || (Number.isInteger(body?.minCm) && body.minCm > 0)) {
    data.minCm = body.minCm;
  }
  if (body?.maxCm === null || (Number.isInteger(body?.maxCm) && body.maxCm > 0)) {
    data.maxCm = body.maxCm;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }
  if (
    data.minCm != null &&
    data.maxCm != null &&
    data.minCm > data.maxCm
  ) {
    return NextResponse.json({ error: "minCm cannot be greater than maxCm" }, { status: 400 });
  }

  try {
    const partSpec = await prisma.partSpec.update({ where: { id: partSpecId }, data });
    return NextResponse.json({ partSpec });
  } catch {
    return NextResponse.json({ error: "part spec not found" }, { status: 404 });
  }
}
