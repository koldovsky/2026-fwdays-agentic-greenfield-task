// Route-level tests for POST /api/payments/webhook (task 1.3): signature
// accept/reject over the raw body, calm rejection of malformed events, and the
// proof that a verified checkout.completed event is what writes the
// subscriptions row (webhook = sole writer). getDb is mocked with a recording
// fake Queryable; the real subscription repo runs against it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signPayload } from "@/shared/lib/payments";
import type { Queryable, QueryResult } from "@/shared/lib/db/port";

const getDb = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/db/pg", () => ({ getDb }));

import { POST } from "./route";

const SECRET = "route-test-secret";

interface Call {
  readonly sql: string;
  readonly params?: readonly unknown[];
}

class FakeDb implements Queryable {
  readonly calls: Call[] = [];
  async query<Row>(sql: string, params?: readonly unknown[]): Promise<QueryResult<Row>> {
    this.calls.push({ sql, params });
    return { rows: [] as Row[] };
  }
}

function webhookRequest(body: string, signature: string): Request {
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-payments-signature": signature },
    body,
  });
}

const VALID_EVENT = JSON.stringify({
  id: "evt_1",
  type: "checkout.completed",
  userId: "u1",
  plan: "pro",
  occurredAt: "2026-07-03T00:00:00.000Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/payments/webhook", () => {
  it("accepts a correctly signed event and writes the subscription (sole writer)", async () => {
    const db = new FakeDb();
    getDb.mockReturnValue(db);

    const response = await POST(webhookRequest(VALID_EVENT, signPayload(VALID_EVENT, SECRET)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    // The verified event is what wrote the subscriptions row.
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/INSERT INTO subscriptions/);
    expect(db.calls[0].params).toEqual([
      "u1",
      "pro",
      "active",
      "2026-08-02T00:00:00.000Z",
    ]);
  });

  it("rejects a missing or wrong signature with 401 and never touches the db", async () => {
    getDb.mockReturnValue(new FakeDb());

    const unsigned = await POST(webhookRequest(VALID_EVENT, ""));
    expect(unsigned.status).toBe(401);
    expect(await unsigned.json()).toEqual({ error: "invalid_signature" });

    const forged = await POST(webhookRequest(VALID_EVENT, signPayload(VALID_EVENT, "wrong")));
    expect(forged.status).toBe(401);

    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects a tampered body — the signature covers the raw bytes", async () => {
    getDb.mockReturnValue(new FakeDb());
    const signature = signPayload(VALID_EVENT, SECRET);
    const tampered = VALID_EVENT.replace('"pro"', '"job_hunt_pass"');

    const response = await POST(webhookRequest(tampered, signature));

    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects a well-signed but malformed event with 400", async () => {
    getDb.mockReturnValue(new FakeDb());
    const garbage = '{"type":"checkout.hacked"}';

    const response = await POST(webhookRequest(garbage, signPayload(garbage, SECRET)));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_event" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns a calm 503 when the webhook secret is not configured (NFR-OBS-01)", async () => {
    vi.stubEnv("PAYMENTS_WEBHOOK_SECRET", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(webhookRequest(VALID_EVENT, "anything"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "payments_unconfigured" });
    consoleError.mockRestore();
  });

  it("returns a calm 500 when infrastructure throws (NFR-OBS-01)", async () => {
    getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not set");
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(webhookRequest(VALID_EVENT, signPayload(VALID_EVENT, SECRET)));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "server_error" });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
