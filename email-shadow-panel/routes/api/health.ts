import { defineHandler } from "nitro";

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

export default defineHandler((event) => {
  if (event.req.method === "GET") {
    return createHealthResponse(true);
  }

  if (event.req.method === "HEAD") {
    return createHealthResponse(false);
  }

  return createMethodNotAllowedResponse();
});