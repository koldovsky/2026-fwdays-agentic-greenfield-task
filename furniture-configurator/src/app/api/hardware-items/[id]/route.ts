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
  const hardwareItemId = Number(id);
  if (!Number.isInteger(hardwareItemId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const data: { name?: string; sku?: string; active?: boolean } = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body?.sku === "string" && body.sku.trim()) {
    data.sku = body.sku.trim();
  }
  if (typeof body?.active === "boolean") {
    data.active = body.active;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  try {
    const hardwareItem = await prisma.hardwareItem.update({
      where: { id: hardwareItemId },
      data,
    });
    return NextResponse.json({ hardwareItem });
  } catch {
    return NextResponse.json({ error: "hardware item not found" }, { status: 404 });
  }
}
