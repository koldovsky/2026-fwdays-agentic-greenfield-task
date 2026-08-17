import { NextResponse } from "next/server";
import {
  InvalidGuidError,
  SessionNotFoundError,
  readSession,
} from "@/lib/document-session";
import { buildPdf, PdfTypeNotAllowedError } from "@/lib/pdf-export";
import { isPreviewType } from "@/lib/template-fill";

type RouteContext = {
  params: Promise<{ guid: string }>;
};

function pdfFilename(
  type: "invoice" | "act",
  invoiceNumber?: string,
  actNumber?: string,
): string {
  if (type === "invoice") {
    const n = invoiceNumber?.trim() || "invoice";
    return `rahunok-${n}.pdf`;
  }
  const n = actNumber?.trim() || "act";
  return `akt-${n}.pdf`;
}

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
    const pdf = await buildPdf(session, typeParam);
    const filename = pdfFilename(
      typeParam,
      session["invoice-number"],
      session["act-number"],
    );

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
    if (error instanceof PdfTypeNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate document PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
