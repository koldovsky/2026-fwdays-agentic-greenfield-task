import { createProductionPublicApiDependencies } from "../../../server/api/composition-root.server.ts";
import { createPublicApiHandlers } from "../../../server/api/handlers.server.ts";

export const runtime = "nodejs";

const handlers = createPublicApiHandlers(createProductionPublicApiDependencies);

export function GET(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function POST(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function PUT(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function PATCH(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function DELETE(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function OPTIONS(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}

export function HEAD(
  request: Request,
  context: { params?: { messageReference?: string } },
): Promise<Response> {
  return handlers.handleMessageDetailRoute(request, context.params ?? {});
}
