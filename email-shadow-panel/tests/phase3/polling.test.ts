import assert from "node:assert/strict";
import test from "node:test";

import { InboxApiClientError, type InboxApiClient } from "../../src/lib/inboxApiClient.ts";
import {
  HIDDEN_POLL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  POLL_RESUME_DELAY_MS,
} from "../../src/lib/inboxController.ts";
import { createRecentInboxesStorage } from "../../src/lib/localSessions.ts";
import {
  FakeScheduler,
  FakeVisibility,
  MemoryStorage,
  createControllerHarness,
  createCreateInboxResult,
  createDeferred,
  createListMessagesResult,
  createRecentInboxRecord,
  flushMicrotasks,
} from "./test-helpers.ts";

test("polling schedules the selected inbox only and does not overlap while requests are pending", async () => {
  const gate = createDeferred<ReturnType<typeof createListMessagesResult>>();
  let listCalls = 0;
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages() {
      listCalls += 1;
      return gate.promise;
    },
    async getMessageDetail(_token, reference) {
      return {
        inbox: createCreateInboxResult().inbox,
        message: {
          reference,
          contentType: "text/plain",
          bodyLength: 19,
          text: "Your code is 482731",
          textPreview: "Your code is 482731",
          markerFound: true,
        },
      };
    },
    async deleteInbox() {
      return undefined;
    },
    async getHealthStatus() {
      return "ok" as const;
    },
  };

  const scheduler = new FakeScheduler();
  const { controller } = createControllerHarness({ api, scheduler });
  controller.initialize();
  const pending = controller.generateInbox();
  await flushMicrotasks();
  scheduler.advanceBy(POLL_INTERVAL_MS * 2);
  assert.equal(listCalls, 1);

  gate.resolve(createListMessagesResult());
  await pending;
  await flushMicrotasks();
  assert.deepEqual(scheduler.pendingDelays(), [POLL_INTERVAL_MS]);
});

test("polling slows while hidden, resumes safely when visible, and honors retry-after plus bounded backoff", async () => {
  let step = 0;
  const visibility = new FakeVisibility();
  const scheduler = new FakeScheduler();
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages() {
      step += 1;
      if (step === 2) {
        throw new InboxApiClientError("rateLimited", "limited", { retryAfterSeconds: 17 });
      }
      if (step === 3) {
        throw new InboxApiClientError("offline", "offline");
      }
      return createListMessagesResult();
    },
    async getMessageDetail(_token, reference) {
      return {
        inbox: createCreateInboxResult().inbox,
        message: {
          reference,
          contentType: "text/plain",
          bodyLength: 19,
          text: "Your code is 482731",
          textPreview: "Your code is 482731",
          markerFound: true,
        },
      };
    },
    async deleteInbox() {
      return undefined;
    },
    async getHealthStatus() {
      return "ok" as const;
    },
  };

  const { controller } = createControllerHarness({ api, scheduler, visibility });
  controller.initialize();
  await controller.generateInbox();
  await flushMicrotasks();
  assert.deepEqual(scheduler.pendingDelays(), [POLL_INTERVAL_MS]);

  visibility.setHidden(true);
  assert.deepEqual(scheduler.pendingDelays(), [HIDDEN_POLL_INTERVAL_MS]);

  visibility.setHidden(false);
  assert.deepEqual(scheduler.pendingDelays(), [POLL_RESUME_DELAY_MS]);

  scheduler.advanceBy(POLL_RESUME_DELAY_MS);
  await flushMicrotasks();
  assert.deepEqual(scheduler.pendingDelays(), [17_000]);

  scheduler.advanceBy(17_000);
  await flushMicrotasks();
  assert.deepEqual(scheduler.pendingDelays(), [5_000]);

  scheduler.advanceBy(5_000);
  await flushMicrotasks();
  assert.deepEqual(scheduler.pendingDelays(), [POLL_INTERVAL_MS]);
});

test("polling stops after expiration, inbox switch, and local forgetting", async () => {
  const first = createRecentInboxRecord({ address: "shadow.panel.001@gmail.com" });
  const second = createRecentInboxRecord({
    address: "shadow.panel.002@gmail.com",
    createdAt: "2026-07-06T12:02:00.000Z",
    capabilityToken: "BAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiI",
  });
  const storage = createRecentInboxesStorage({
    storage: new MemoryStorage(),
    now: () => "2026-07-06T12:10:00.000Z",
  });
  storage.saveInbox(first, { select: true });
  storage.saveInbox(second);

  const scheduler = new FakeScheduler();
  const calls: string[] = [];
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages(capabilityToken) {
      calls.push(capabilityToken);
      if (capabilityToken === first.capabilityToken) {
        throw new InboxApiClientError("sessionExpired", "expired");
      }
      return createListMessagesResult({ address: second.address });
    },
    async getMessageDetail(_token, reference) {
      return {
        inbox: createCreateInboxResult().inbox,
        message: {
          reference,
          contentType: "text/plain",
          bodyLength: 19,
          text: "Your code is 482731",
          textPreview: "Your code is 482731",
          markerFound: true,
        },
      };
    },
    async deleteInbox() {
      return undefined;
    },
    async getHealthStatus() {
      return "ok" as const;
    },
  };

  const { controller } = createControllerHarness({ api, storage, scheduler });
  controller.initialize();
  await flushMicrotasks();
  assert.equal(controller.getState().selectedInbox?.address, second.address);
  assert.equal(controller.getState().polling.active, true);

  await controller.forgetSelectedInbox();
  assert.equal(controller.getState().polling.active, false);
  assert.deepEqual(scheduler.pendingDelays(), []);
  assert.deepEqual(calls, [first.capabilityToken, second.capabilityToken]);
});
