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
  const catalogEntryId = Number(id);
  if (!Number.isInteger(catalogEntryId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  try {
    const catalogEntry = await prisma.catalogEntry.update({
      where: { id: catalogEntryId },
      data: { active: body.active },
    });
    return NextResponse.json({ catalogEntry });
  } catch {
    return NextResponse.json({ error: "catalog entry not found" }, { status: 404 });
  }
}
