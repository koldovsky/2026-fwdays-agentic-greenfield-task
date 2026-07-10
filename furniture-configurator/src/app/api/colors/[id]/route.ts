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
  const colorId = Number(id);
  if (!Number.isInteger(colorId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const data: { name?: string; active?: boolean } = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body?.active === "boolean") {
    data.active = body.active;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  try {
    const color = await prisma.color.update({ where: { id: colorId }, data });
    return NextResponse.json({ color });
  } catch {
    return NextResponse.json({ error: "color not found" }, { status: 404 });
  }
}
