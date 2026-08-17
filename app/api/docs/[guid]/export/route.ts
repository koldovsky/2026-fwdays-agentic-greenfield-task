import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
  readSession,
} from "@/lib/document-session";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guid } = await context.params;
  try {
    const session = await readSession(guid);
    const body = `${JSON.stringify(session, null, 2)}\n`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${guid}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof InvalidGuidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to export session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
