import assert from "node:assert/strict";
import test from "node:test";

import { InMemorySessionRepository } from "../../server/session/in-memory-session-repository.server.ts";
import {
  createPersistedSessionRecord,
  createTestEncryptionService,
  MutableClock,
} from "./test-helpers.ts";

test("in-memory repository supports create, read, delete, and visitor counting", async () => {
  const clock = new MutableClock();
  const repository = new InMemorySessionRepository({ clock });
  const record = createPersistedSessionRecord({ clock });

  await repository.create(record, 15 * 60 * 1000);
  assert.deepEqual(await repository.findByCapabilityTokenHash(record.capabilityTokenHash), {
    status: "active",
    session: record,
  });
  assert.equal(await repository.countActiveSessionsByVisitorHash(record.anonymousVisitorHash), 1);
  assert.equal(await repository.deleteByCapabilityTokenHash(record.capabilityTokenHash), true);
  assert.deepEqual(await repository.findByCapabilityTokenHash(record.capabilityTokenHash), {
    status: "missing",
  });
});

test("in-memory repository expires sessions and preserves TTL on updates", async () => {
  const clock = new MutableClock();
  const repository = new InMemorySessionRepository({ clock });
  const record = createPersistedSessionRecord({ clock, sessionTtlMs: 1_000 });

  await repository.create(record, 1_000);
  const update = await repository.updateEncryptedState({
    capabilityTokenHash: record.capabilityTokenHash,
    expectedVersion: record.providerStateVersion,
    encryptedSessionState: createTestEncryptionService().encrypt({ step: "next" }),
    updatedAt: clock.now().toISOString(),
  });

  assert.equal(update.status, "updated");
  assert.equal(update.session.expiresAt, record.expiresAt);

  clock.advanceMs(1_001);
  assert.deepEqual(await repository.findByCapabilityTokenHash(record.capabilityTokenHash), {
    status: "expired",
  });
});

test("in-memory repository rejects stale compare-and-set updates", async () => {
  const clock = new MutableClock();
  const repository = new InMemorySessionRepository({ clock });
  const record = createPersistedSessionRecord({ clock });

  await repository.create(record, 15 * 60 * 1000);
  const first = await repository.updateEncryptedState({
    capabilityTokenHash: record.capabilityTokenHash,
    expectedVersion: 1,
    encryptedSessionState: createTestEncryptionService().encrypt({ step: "first" }),
    updatedAt: clock.now().toISOString(),
  });
  const second = await repository.updateEncryptedState({
    capabilityTokenHash: record.capabilityTokenHash,
    expectedVersion: 1,
    encryptedSessionState: createTestEncryptionService().encrypt({ step: "second" }),
    updatedAt: clock.now().toISOString(),
  });

  assert.equal(first.status, "updated");
  assert.deepEqual(second, {
    status: "stale",
    currentVersion: 2,
  });
});
