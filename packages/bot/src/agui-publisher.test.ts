// dashboard tasks.md §4.1 — `agui-publisher.ts`'s own unit coverage.
// `noopAguiPublisher` is real, working code (not a throwing stub, see the
// module's header comment), so this test is legitimately green immediately
// — the genuinely red half this task owes lives in `pipeline.test.ts`
// (§4.3): whether `handleUpdate()` actually CALLS a publisher at the right
// moments. This file only pins the no-op's own contract.

import { describe, expect, it } from "vitest";
import { noopAguiPublisher, type AguiEvent } from "./agui-publisher.ts";

const SOME_EVENT: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" };

describe("noopAguiPublisher (packages/bot/src/agui-publisher.ts, dashboard tasks.md 4.1)", () => {
  // @trace TC-PROTO-01
  it("publish() resolves without throwing, for any AguiEvent shape", async () => {
    await expect(noopAguiPublisher.publish(SOME_EVENT)).resolves.toBeUndefined();
  });

  // @trace TC-PROTO-01
  it("publish() records nothing observable — calling it repeatedly never throws and leaves no growing state to inspect", async () => {
    // `noopAguiPublisher` carries no recording array/field at all (unlike
    // `FakeAguiPublisher`) — the absence of ANY state to grow IS the
    // contract; repeated calls resolving cleanly, with nothing to assert on
    // besides that, is the whole test.
    await expect(noopAguiPublisher.publish(SOME_EVENT)).resolves.toBeUndefined();
    await expect(
      noopAguiPublisher.publish({ type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-1" }),
    ).resolves.toBeUndefined();
  });
});
