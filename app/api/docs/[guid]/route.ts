import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
  readSession,
  updateSession,
  type DocumentSessionPatch,
} from "@/lib/document-session";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guid } = await context.params;
  try {
    const session = await readSession(guid);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof InvalidGuidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to read session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { guid } = await context.params;
  let patch: DocumentSessionPatch;
  try {
    patch = (await request.json()) as DocumentSessionPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const session = await updateSession(guid, patch);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof InvalidGuidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof Error &&
      (error.message.startsWith("Invalid doc-type") ||
        error.message.startsWith("Invalid current-step"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
