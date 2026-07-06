// Test-first (red): apps/dashboard/app/api/decisions/[requestId]/route.ts's
// `POST` is a typed throwing stub (dashboard tasks.md §5.7's red half) —
// every test below is expected to FAIL against the stub, for the right
// reason (the stub's synchronous throw surfacing from
// `await POST(request, ctx)`).
//
// PINNED RESPONSE SHAPE (see route.ts's own header comment for the full
// rationale): HTTP 200, body `{ status: "not_connected", message: "..." }`
// with a Ukrainian, non-alarming `message` — never a 404/500 a real teacher
// action could be mistaken for a bug (design.md Decision 4).

import { describe, expect, it } from "vitest";
import { POST } from "./route.ts";

function decisionUrl(requestId: number): string {
  return `http://127.0.0.1:3000/api/decisions/${requestId}`;
}

function paramsFor(requestId: number): { params: Promise<{ requestId: string }> } {
  return { params: Promise.resolve({ requestId: String(requestId) }) };
}

describe("POST /api/decisions/:requestId (dashboard tasks.md §5.7, design.md Decision 4)", () => {
  it("responds with a deterministic, Ukrainian, non-500 'not yet connected' payload", async () => {
    const response = await POST(
      new Request(decisionUrl(1), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      }),
      paramsFor(1),
    );

    expect(response.status).toBe(200);
    expect(response.status).not.toBe(404);
    expect(response.status).not.toBe(500);

    const body = await response.json();
    expect(body.status).toBe("not_connected");
    expect(body.message).toMatch(/не підключено/i);
  });

  it("responds the same way regardless of which action was posted (Decline, Propose another time)", async () => {
    const response = await POST(
      new Request(decisionUrl(2), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      paramsFor(2),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("not_connected");
  });
});
