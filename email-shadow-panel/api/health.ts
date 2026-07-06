import { createProductionPublicApiDependencies } from "../server/api/composition-root.server.ts";
import { createPublicApiHandlers } from "../server/api/handlers.server.ts";

export const runtime = "nodejs";

const handlers = createPublicApiHandlers(createProductionPublicApiDependencies);

export function GET(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function POST(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function PUT(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function PATCH(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}

export function HEAD(request: Request): Promise<Response> {
  return handlers.handleHealthRoute(request);
}
