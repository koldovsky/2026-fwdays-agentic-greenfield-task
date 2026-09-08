import assert from "node:assert/strict";
import test from "node:test";

import { InboxApiClientError, type InboxApiClient } from "../../src/lib/inboxApiClient.ts";
import { createRecentInboxesStorage } from "../../src/lib/localSessions.ts";
import {
  MemoryStorage,
  createControllerHarness,
  createCreateInboxResult,
  createListMessagesResult,
  createRecentInboxRecord,
} from "./test-helpers.ts";

test("controller forgetRecentInbox uses existing browser-local removal semantics without remote deletion", () => {
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
  storage.saveInbox(first, { select: true });
  storage.saveInbox(second);

  let deleteCalls = 0;
  const api: InboxApiClient = {
    async createInbox() {
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
      deleteCalls += 1;
      throw new InboxApiClientError("offline", "offline");
    },
    async getHealthStatus() {
      return "ok" as const;
    },
  };

  const { controller } = createControllerHarness({ api, storage });
  controller.initialize();
  controller.forgetRecentInbox(first.id);

  assert.equal(deleteCalls, 0);
  assert.equal(
    controller.getState().recentInboxes.some((inbox) => inbox.id === first.id),
    false,
  );
  assert.equal(controller.getState().removalNotice, "Inbox removed from this browser.");
});
