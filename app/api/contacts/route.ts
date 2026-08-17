import { NextResponse } from "next/server";
import { InvalidContactError, listContacts } from "@/lib/contacts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;

  try {
    const contacts = await listContacts({ q: q ?? undefined });
    return NextResponse.json(contacts);
  } catch (error) {
    if (error instanceof InvalidContactError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to list contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
