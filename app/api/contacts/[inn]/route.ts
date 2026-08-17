import { NextResponse } from "next/server";
import {
  ContactNotFoundError,
  InvalidContactError,
  getContact,
  normalizeContact,
  putContact,
} from "@/lib/contacts";

type RouteContext = {
  params: Promise<{ inn: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { inn: rawInn } = await context.params;
  const inn = decodeURIComponent(rawInn);

  try {
    const contact = await getContact(inn);
    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof InvalidContactError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ContactNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to read contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { inn: rawInn } = await context.params;
  const inn = decodeURIComponent(rawInn);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const normalized = normalizeContact(body);
    if (normalized.inn !== inn.trim()) {
      return NextResponse.json(
        {
          error: `URL inn "${inn}" must match body inn "${normalized.inn}"`,
        },
        { status: 400 },
      );
    }
    const contact = await putContact(normalized);
    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof InvalidContactError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
