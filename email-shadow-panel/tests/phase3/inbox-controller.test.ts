import assert from "node:assert/strict";
import test from "node:test";

import { InboxApiClientError, type InboxApiClient } from "../../src/lib/inboxApiClient.ts";
import { createRecentInboxesStorage } from "../../src/lib/localSessions.ts";
import {
  MemoryStorage,
  createControllerHarness,
  createCreateInboxResult,
  createDeferred,
  createListMessagesResult,
  createRecentInboxRecord,
  flushMicrotasks,
} from "./test-helpers.ts";

test("controller generates once, persists the inbox, and prevents duplicate generate requests", async () => {
  const gate = createDeferred<void>();
  let createCalls = 0;
  const api: InboxApiClient = {
    async createInbox() {
      createCalls += 1;
      await gate.promise;
      return createCreateInboxResult();
    },
    async listMessages() {
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

  const { controller, storage } = createControllerHarness({ api });
  controller.initialize();

  const first = controller.generateInbox();
  const second = controller.generateInbox();
  gate.resolve();
  await Promise.all([first, second]);

  assert.equal(createCalls, 1);
  assert.equal(controller.getState().selectedInbox?.address, "shadow.panel.001@gmail.com");
  assert.equal(storage.load().inboxes.length, 1);
});

test("controller restores only the selected inbox on startup and supports inbox switching", async () => {
  const storage = createRecentInboxesStorage({
    storage: new MemoryStorage(),
    now: () => "2026-07-06T12:10:00.000Z",
  });
  const first = createRecentInboxRecord({ address: "shadow.panel.001@gmail.com" });
  const second = createRecentInboxRecord({
    address: "shadow.panel.002@gmail.com",
    createdAt: "2026-07-06T12:02:00.000Z",
    capabilityToken: "BAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiI",
  });
  storage.saveInbox(first);
  storage.saveInbox(second, { select: true });

  const listCalls: string[] = [];
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages(capabilityToken) {
      listCalls.push(capabilityToken);
      return createListMessagesResult({
        address: capabilityToken === second.capabilityToken ? second.address : first.address,
      });
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

  const { controller } = createControllerHarness({ api, storage });
  controller.initialize();
  await flushMicrotasks();

  assert.deepEqual(listCalls, [second.capabilityToken]);
  await controller.selectInbox(first.id);
  await flushMicrotasks();
  assert.deepEqual(listCalls, [second.capabilityToken, first.capabilityToken]);
});

test("controller aborts obsolete list requests when switching inboxes", async () => {
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

  const firstGate = createDeferred<ReturnType<typeof createListMessagesResult>>();
  let firstSignal: AbortSignal | undefined;
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages(capabilityToken, options) {
      if (capabilityToken === first.capabilityToken) {
        firstSignal = options?.signal;
        return firstGate.promise;
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

  const { controller } = createControllerHarness({ api, storage });
  controller.initialize();
  await flushMicrotasks();
  await controller.selectInbox(second.id);

  assert.equal(firstSignal?.aborted, true);
  firstGate.resolve(createListMessagesResult({ address: first.address }));
  await flushMicrotasks();
  assert.equal(controller.getState().selectedInbox?.address, second.address);
});

test("controller preserves stable message selection and clears stale selections", async () => {
  let step = 0;
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages() {
      step += 1;
      if (step === 1) {
        return createListMessagesResult({
          messages: [
            { reference: "msg_validvalid1", from: "Bot", subject: "First", time: "12:01" },
            { reference: "msg_validvalid2", from: "Bot", subject: "Second", time: "12:02" },
          ],
        });
      }
      if (step === 2) {
        return createListMessagesResult({
          messages: [
            { reference: "msg_validvalid1", from: "Bot", subject: "First", time: "12:01" },
            { reference: "msg_validvalid2", from: "Bot", subject: "Second", time: "12:02" },
          ],
        });
      }
      return createListMessagesResult({
        messages: [{ reference: "msg_validvalid1", from: "Bot", subject: "First", time: "12:01" }],
      });
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

  const { controller } = createControllerHarness({ api });
  await controller.generateInbox();
  await controller.selectMessage("msg_validvalid2");
  await controller.refreshMessages();
  assert.equal(controller.getState().selectedMessageReference, "msg_validvalid2");

  await controller.refreshMessages();
  assert.equal(controller.getState().selectedMessageReference, null);
});

test("controller removes expired inboxes and forgets locally when remote deletion cannot be confirmed", async () => {
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

  let deletedCapability: string | null = null;
  const api: InboxApiClient = {
    async createInbox() {
      return createCreateInboxResult();
    },
    async listMessages(capabilityToken) {
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
    async deleteInbox(capabilityToken) {
      deletedCapability = capabilityToken;
      throw new InboxApiClientError("offline", "offline");
    },
    async getHealthStatus() {
      return "ok" as const;
    },
  };

  const { controller } = createControllerHarness({ api, storage });
  controller.initialize();
  await flushMicrotasks();

  assert.equal(controller.getState().selectedInbox?.address, second.address);

  await controller.forgetSelectedInbox();
  assert.equal(deletedCapability, second.capabilityToken);
  assert.equal(controller.getState().selectedInbox, null);
  assert.match(controller.getState().removalNotice ?? "", /forgotten locally/u);
});
