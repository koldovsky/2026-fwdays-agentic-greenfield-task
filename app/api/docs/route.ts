import { NextResponse } from "next/server";
import { createSession } from "@/lib/document-session";

export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json({ guid: session.guid, session }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
