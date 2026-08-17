import { NextResponse } from "next/server";
import {
  InvalidServiceError,
  readServicesCatalog,
  writeServicesCatalog,
} from "@/lib/services-catalog";

export async function GET() {
  try {
    const services = await readServicesCatalog();
    return NextResponse.json(services);
  } catch (error) {
    if (error instanceof InvalidServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to read services catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const services = await writeServicesCatalog(body);
    return NextResponse.json(services);
  } catch (error) {
    if (error instanceof InvalidServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save services catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
