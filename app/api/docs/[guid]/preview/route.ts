import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
  readSession,
} from "@/lib/document-session";
import {
  docTypeAllowsPreview,
  fillActHtml,
  fillInvoiceHtml,
  isPreviewType,
} from "@/lib/template-fill";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { guid } = await context.params;
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");

  if (!isPreviewType(typeParam)) {
    return NextResponse.json(
      { error: "Query type must be invoice or act" },
      { status: 400 },
    );
  }

  try {
    const session = await readSession(guid);

    if (!docTypeAllowsPreview(session["doc-type"], typeParam)) {
      return NextResponse.json(
        {
          error: `Document type ${session["doc-type"]} does not include ${typeParam}`,
        },
        { status: 400 },
      );
    }

    const html =
      typeParam === "invoice"
        ? await fillInvoiceHtml(session)
        : await fillActHtml(session);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
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
      error instanceof Error
        ? error.message
        : "Failed to generate document preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
