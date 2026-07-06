// Review-gate FIX 1 [CRITICAL] (S3 remediation): `HttpAguiPublisher.publish`
// must never hang the caller indefinitely — a dashboard listener that
// accepts the TCP connection but never responds (slow-but-running, not
// down) must not stall a lead's turn forever. The fix adds
// `signal: AbortSignal.timeout(2000)` to the `fetch` call; a timeout
// rejects the fetch promise, which `publish()` already catches and
// swallows (this module's own header contract: "never rejects").
//
// RED: before the fix, `fetch` is called with no `signal` at all — the
// assertion on `init.signal` being an `AbortSignal` fails.

import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpAguiPublisher } from "./http-agui-publisher.ts";
import type { AguiEvent } from "./agui-publisher.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleEvent: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" };

describe("HttpAguiPublisher — fetch timeout (review-gate FIX 1)", () => {
  it("passes an AbortSignal to fetch so a hanging response cannot block forever", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const publisher = new HttpAguiPublisher("http://localhost:9999/api/agui/ingest");
    await publisher.publish(sampleEvent);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("a fetch that rejects because the timeout aborted it is swallowed, never rethrown", async () => {
    const abortError = new DOMException("The operation was aborted.", "TimeoutError");
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const publisher = new HttpAguiPublisher("http://localhost:9999/api/agui/ingest");
    await expect(publisher.publish(sampleEvent)).resolves.toBeUndefined();
  });
});
