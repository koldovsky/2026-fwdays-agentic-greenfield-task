export const runtime = "nodejs";

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

export async function GET(_request: Request): Promise<Response> {
  return createHealthResponse(true);
}

export async function HEAD(_request: Request): Promise<Response> {
  return createHealthResponse(false);
}
