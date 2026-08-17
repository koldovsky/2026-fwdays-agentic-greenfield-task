import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
} from "@/lib/document-session";
import {
  InvalidDateError,
  issueNumbersForSession,
} from "@/lib/document-numbering";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

type IssueBody = {
  date?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { guid } = await context.params;

  let body: IssueBody;
  try {
    body = (await request.json()) as IssueBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const date = body.date;
  if (typeof date !== "string" || date.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid date" },
      { status: 400 },
    );
  }

  try {
    const session = await issueNumbersForSession(guid, date.trim());
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof InvalidGuidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InvalidDateError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to issue numbers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
