import { createFileRoute } from "@tanstack/react-router";

const HEALTH_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
} as const;

const HEALTH_BODY = JSON.stringify({
  data: {
    status: "ok",
  },
});

function createHealthResponse(includeBody: boolean): Response {
  return new Response(includeBody ? HEALTH_BODY : null, {
    status: 200,
    headers: HEALTH_HEADERS,
  });
}

function createMethodNotAllowedResponse(): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Allow: "GET, HEAD",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => createHealthResponse(true),
      HEAD: async () => createHealthResponse(false),
      ANY: async () => createMethodNotAllowedResponse(),
    },
  },
});
