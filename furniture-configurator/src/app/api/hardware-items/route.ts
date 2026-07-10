import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/requireRole";

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const hardwareItems = await prisma.hardwareItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ hardwareItems });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const sku = typeof body?.sku === "string" ? body.sku.trim() : "";
  if (!name || !sku) {
    return NextResponse.json({ error: "name and sku are required" }, { status: 400 });
  }

  const existing = await prisma.hardwareItem.findFirst({
    where: { OR: [{ name }, { sku }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A hardware item with this name or SKU already exists", existing },
      { status: 409 },
    );
  }

  const hardwareItem = await prisma.hardwareItem.create({ data: { name, sku } });
  return NextResponse.json({ hardwareItem }, { status: 201 });
}
