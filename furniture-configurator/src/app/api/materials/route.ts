import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/requireRole";

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const materials = await prisma.material.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ materials });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.material.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A material with this name already exists", existing },
      { status: 409 },
    );
  }

  const material = await prisma.material.create({ data: { name } });
  return NextResponse.json({ material }, { status: 201 });
}
