import type { InboxApiClient } from "../../src/lib/inboxApiClient.ts";
import {
  createRecentInboxId,
  createRecentInboxesStorage,
  type RecentInboxesStorage,
} from "../../src/lib/localSessions.ts";
import type {
  CreateInboxResult,
  ListMessagesResult,
  MessageDetailResult,
} from "../../src/lib/inboxApiClient.ts";
import {
  InboxController,
  type InboxControllerDependencies,
  type TimerScheduler,
  type VisibilitySource,
} from "../../src/lib/inboxController.ts";
import type { RecentInboxRecord } from "../../src/types/inbox.ts";

export class MemoryStorage implements Storage {
  readonly length = 0;
  private readonly values = new Map<string, string>();

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

export class FakeScheduler implements TimerScheduler {
  private nowMs = Date.parse("2026-07-06T12:00:00.000Z");
  private nextId = 1;
  private readonly timers = new Map<number, { runAt: number; callback: () => void }>();

  now(): number {
    return this.nowMs;
  }

  setTimeout(callback: () => void, delayMs: number): unknown {
    const id = this.nextId++;
    this.timers.set(id, {
      runAt: this.nowMs + delayMs,
      callback,
    });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(Number(handle));
  }

  advanceBy(delayMs: number): void {
    const target = this.nowMs + delayMs;

    while (true) {
      let nextTimer: { id: number; runAt: number; callback: () => void } | null = null;
      for (const [id, timer] of this.timers) {
        if (timer.runAt > target) {
          continue;
        }
        if (!nextTimer || timer.runAt < nextTimer.runAt) {
          nextTimer = { id, ...timer };
        }
      }

      if (!nextTimer) {
        break;
      }

      this.nowMs = nextTimer.runAt;
      this.timers.delete(nextTimer.id);
      nextTimer.callback();
    }

    this.nowMs = target;
  }

  pendingDelays(): number[] {
    return [...this.timers.values()].map((timer) => timer.runAt - this.nowMs).sort((a, b) => a - b);
  }
}

export class FakeVisibility implements VisibilitySource {
  private hidden = false;
  private readonly listeners = new Set<() => void>();

  isHidden(): boolean {
    return this.hidden;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createRecentInboxRecord(input: {
  address: string;
  createdAt?: string;
  expiresAt?: string;
  capabilityToken?: string;
}): RecentInboxRecord {
  const createdAt = input.createdAt ?? "2026-07-06T12:00:00.000Z";
  const derivedCapabilityToken = Buffer.from(`${input.address}:${createdAt}`, "utf8")
    .toString("base64url")
    .padEnd(43, "A")
    .slice(0, 43);

  return {
    id: createRecentInboxId(input.address, createdAt, "emailnator"),
    providerId: "emailnator",
    address: input.address,
    capabilityToken: input.capabilityToken ?? derivedCapabilityToken,
    createdAt,
    expiresAt: input.expiresAt ?? "2026-07-06T13:00:00.000Z",
    lastOpenedAt: createdAt,
  };
}

export function createCreateInboxResult(address = "shadow.panel.001@gmail.com"): CreateInboxResult {
  return {
    capabilityToken: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    inbox: {
      address,
      createdAt: "2026-07-06T12:00:00.000Z",
      updatedAt: "2026-07-06T12:00:00.000Z",
      expiresAt: "2026-07-06T13:00:00.000Z",
    },
  };
}

export function createListMessagesResult(options?: {
  address?: string;
  messages?: Array<{ reference: string; from: string; subject: string; time: string }>;
}): ListMessagesResult {
  return {
    inbox: {
      address: options?.address ?? "shadow.panel.001@gmail.com",
      createdAt: "2026-07-06T12:00:00.000Z",
      updatedAt: "2026-07-06T12:01:00.000Z",
      expiresAt: "2026-07-06T13:00:00.000Z",
    },
    messages: options?.messages ?? [
      {
        reference: "msg_validvalid1",
        from: "Verification Robot",
        subject: "Your verification code",
        time: "2026-07-06 12:01",
      },
    ],
  };
}

export function createMessageDetailResult(reference = "msg_validvalid1"): MessageDetailResult {
  return {
    inbox: {
      address: "shadow.panel.001@gmail.com",
      createdAt: "2026-07-06T12:00:00.000Z",
      updatedAt: "2026-07-06T12:01:00.000Z",
      expiresAt: "2026-07-06T13:00:00.000Z",
    },
    message: {
      reference,
      contentType: "text/plain",
      bodyLength: 19,
      text: "Your code is 482731",
      textPreview: "Your code is 482731",
      markerFound: true,
    },
  };
}

export function createControllerHarness(options?: {
  api?: InboxApiClient;
  storage?: RecentInboxesStorage;
  scheduler?: FakeScheduler;
  visibility?: FakeVisibility;
}) {
  const scheduler = options?.scheduler ?? new FakeScheduler();
  const visibility = options?.visibility ?? new FakeVisibility();
  const storage =
    options?.storage ??
    createRecentInboxesStorage({
      storage: new MemoryStorage(),
      now: () => new Date(scheduler.now()).toISOString(),
    });
  const api =
    options?.api ??
    ({
      async createInbox() {
        return createCreateInboxResult();
      },
      async listMessages() {
        return createListMessagesResult();
      },
      async getMessageDetail(_capabilityToken, reference) {
        return createMessageDetailResult(reference);
      },
      async deleteInbox() {
        return undefined;
      },
      async getHealthStatus() {
        return "ok" as const;
      },
    } satisfies InboxApiClient);

  const dependencies: InboxControllerDependencies = {
    api,
    storage,
    scheduler,
    visibility,
  };

  return {
    scheduler,
    visibility,
    storage,
    api,
    controller: new InboxController(dependencies),
  };
}

export function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
