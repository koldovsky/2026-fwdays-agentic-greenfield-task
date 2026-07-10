import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/requireRole";

export async function GET(request: NextRequest) {
  const unauthorized = requireRole(request, ["admin", "manager"]);
  if (unauthorized) return unauthorized;

  const productTypes = await prisma.productType.findMany({
    include: { partSpecs: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ productTypes });
}
