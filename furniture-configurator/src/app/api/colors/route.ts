import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/requireRole";

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const colors = await prisma.color.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ colors });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin"]);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.color.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A color with this name already exists", existing },
      { status: 409 },
    );
  }

  const color = await prisma.color.create({ data: { name } });
  return NextResponse.json({ color }, { status: 201 });
}
