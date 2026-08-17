import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
  copySessionFields,
} from "@/lib/document-session";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

type CopyBody = {
  "source-guid"?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { guid } = await context.params;

  let body: CopyBody;
  try {
    body = (await request.json()) as CopyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceGuid = body["source-guid"];
  if (typeof sourceGuid !== "string" || sourceGuid.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid source-guid" },
      { status: 400 },
    );
  }

  try {
    const session = await copySessionFields(guid, sourceGuid.trim());
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof InvalidGuidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to copy session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
