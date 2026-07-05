import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/app/lib/dal";
import { searchNotes } from "@/lib/search/queries";

export async function GET(request: NextRequest) {
  const { userId } = await verifySession();

  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? undefined;
  const folderId = params.get("folderId") ?? undefined;
  const tagIds = params.get("tagIds")?.split(",").filter(Boolean);
  const from = params.get("from");
  const to = params.get("to");

  const notes = await searchNotes(userId, {
    query,
    folderId,
    tagIds,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return NextResponse.json({ notes });
}
