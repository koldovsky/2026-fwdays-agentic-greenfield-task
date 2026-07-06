import assert from "node:assert/strict";
import test from "node:test";

import {
  RECENT_INBOX_LIMIT,
  RECENT_INBOX_STORAGE_KEY,
  createRecentInboxesStorage,
} from "../../src/lib/localSessions.ts";
import { MemoryStorage, createRecentInboxRecord } from "./test-helpers.ts";

function createStorage(now = "2026-07-06T12:00:00.000Z") {
  const backing = new MemoryStorage();
  const repo = createRecentInboxesStorage({
    storage: backing,
    now: () => now,
  });
  return { backing, repo };
}

test("recent inbox storage round-trips valid records and persists only minimal browser fields", () => {
  const { backing, repo } = createStorage();
  const record = createRecentInboxRecord({ address: "shadow.panel.001@gmail.com" });

  repo.saveInbox(record, { select: true });
  const loaded = repo.load();
  const raw = backing.getItem(RECENT_INBOX_STORAGE_KEY) ?? "";

  assert.equal(loaded.selectedInboxId, record.id);
  assert.deepEqual(loaded.inboxes[0], record);
  assert.match(raw, /capabilityToken/u);
  assert.doesNotMatch(raw, /providerState|message body|otp|482731/u);
});

test("recent inbox storage recovers safely from malformed json, invalid fields, and unsupported schema versions", () => {
  const malformed = new MemoryStorage();
  malformed.setItem(RECENT_INBOX_STORAGE_KEY, "not json");
  const malformedRepo = createRecentInboxesStorage({ storage: malformed });
  assert.equal(malformedRepo.load().recovered, true);
  assert.deepEqual(malformedRepo.load().inboxes, []);

  const invalid = new MemoryStorage();
  invalid.setItem(
    RECENT_INBOX_STORAGE_KEY,
    JSON.stringify({ version: 2, selectedInboxId: "a", inboxes: [{ bad: true }] }),
  );
  const invalidRepo = createRecentInboxesStorage({ storage: invalid });
  assert.equal(invalidRepo.load().recovered, true);

  const unsupported = new MemoryStorage();
  unsupported.setItem(
    RECENT_INBOX_STORAGE_KEY,
    JSON.stringify({ version: 99, selectedInboxId: null, inboxes: [] }),
  );
  const unsupportedRepo = createRecentInboxesStorage({ storage: unsupported });
  assert.equal(unsupportedRepo.load().recovered, true);
});

test("recent inbox storage removes duplicates, prunes expired records, enforces bounds, and keeps deterministic ordering", () => {
  const { repo } = createStorage("2026-07-06T12:10:00.000Z");
  const primary = createRecentInboxRecord({ address: "shadow.panel.001@gmail.com" });
  const duplicate = { ...primary, lastOpenedAt: "2026-07-06T12:05:00.000Z" };
  const expired = createRecentInboxRecord({
    address: "shadow.panel.expired@gmail.com",
    expiresAt: "2026-07-06T12:05:00.000Z",
  });

  repo.saveInbox(primary, { select: true });
  repo.saveInbox(duplicate, { select: true });
  repo.saveInbox(expired);

  for (let index = 2; index <= RECENT_INBOX_LIMIT + 2; index += 1) {
    repo.saveInbox(
      createRecentInboxRecord({
        address: `shadow.panel.${String(index).padStart(3, "0")}@gmail.com`,
        createdAt: `2026-07-06T12:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
  }
  repo.selectInbox(primary.id);

  const loaded = repo.load();

  assert.equal(
    loaded.inboxes.some((record) => record.address.includes("expired")),
    false,
  );
  assert.equal(loaded.inboxes.length, RECENT_INBOX_LIMIT);
  assert.equal(loaded.inboxes[0]?.address, "shadow.panel.007@gmail.com");
});

test("recent inbox storage restores selected inbox identity and tolerates unavailable localStorage", () => {
  const backing = new MemoryStorage();
  const first = createRecentInboxRecord({ address: "shadow.panel.001@gmail.com" });
  const second = createRecentInboxRecord({
    address: "shadow.panel.002@gmail.com",
    createdAt: "2026-07-06T12:02:00.000Z",
  });
  const repo = createRecentInboxesStorage({
    storage: backing,
    now: () => "2026-07-06T12:03:00.000Z",
  });

  repo.saveInbox(first);
  repo.saveInbox(second, { select: true });
  assert.equal(repo.load().selectedInboxId, second.id);

  const unavailableRepo = createRecentInboxesStorage({ storage: null });
  assert.deepEqual(unavailableRepo.load().inboxes, []);
});
