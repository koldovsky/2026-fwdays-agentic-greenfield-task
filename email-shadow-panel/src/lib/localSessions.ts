import { z } from "zod";
import type { ProviderId, RecentInboxRecord } from "../types/inbox.ts";

export const RECENT_INBOX_STORAGE_KEY = "esp.recentInboxes.v2";
export const RECENT_INBOX_STORAGE_VERSION = 2;
export const RECENT_INBOX_LIMIT = 5;

const recentInboxRecordSchema = z.object({
  id: z.string().min(1).max(256),
  providerId: z.literal("emailnator"),
  address: z.string().email(),
  capabilityToken: z
    .string()
    .min(20)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/u),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime(),
});

const storedRecentInboxSchema = z.object({
  version: z.literal(RECENT_INBOX_STORAGE_VERSION),
  selectedInboxId: z.string().min(1).max(256).nullable().optional(),
  inboxes: z.array(recentInboxRecordSchema),
});

export interface RecentInboxesSnapshot {
  inboxes: RecentInboxRecord[];
  selectedInboxId: string | null;
  recovered: boolean;
  changed: boolean;
}

export interface RecentInboxesStorage {
  load(): RecentInboxesSnapshot;
  saveInbox(record: RecentInboxRecord, options?: { select?: boolean }): RecentInboxesSnapshot;
  selectInbox(
    id: string,
    patch?: Partial<Pick<RecentInboxRecord, "expiresAt">>,
  ): RecentInboxesSnapshot;
  removeInbox(id: string): RecentInboxesSnapshot;
  clear(): void;
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function compareInboxes(left: RecentInboxRecord, right: RecentInboxRecord): number {
  const lastOpened = right.lastOpenedAt.localeCompare(left.lastOpenedAt);
  if (lastOpened !== 0) {
    return lastOpened;
  }

  const createdAt = right.createdAt.localeCompare(left.createdAt);
  if (createdAt !== 0) {
    return createdAt;
  }

  return left.address.localeCompare(right.address);
}

function isExpired(record: RecentInboxRecord, nowIso: string): boolean {
  return record.expiresAt <= nowIso;
}

function writeSnapshot(storage: Storage | null, snapshot: RecentInboxesSnapshot): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      RECENT_INBOX_STORAGE_KEY,
      JSON.stringify({
        version: RECENT_INBOX_STORAGE_VERSION,
        selectedInboxId: snapshot.selectedInboxId,
        inboxes: snapshot.inboxes,
      }),
    );
  } catch {
    /* storage failures must not crash the app */
  }
}

function sanitizeSnapshot(input: unknown, nowIso: string, limit: number): RecentInboxesSnapshot {
  const parsed = storedRecentInboxSchema.safeParse(input);
  if (!parsed.success) {
    return {
      inboxes: [],
      selectedInboxId: null,
      recovered: true,
      changed: true,
    };
  }

  const seen = new Set<string>();
  let changed = false;
  const inboxes = parsed.data.inboxes
    .filter((record) => {
      if (isExpired(record, nowIso)) {
        changed = true;
        return false;
      }

      const duplicateKey = `${record.id}:${record.capabilityToken}`;
      if (seen.has(duplicateKey)) {
        changed = true;
        return false;
      }

      seen.add(duplicateKey);
      return true;
    })
    .sort(compareInboxes)
    .slice(0, limit);

  if (inboxes.length !== parsed.data.inboxes.length) {
    changed = true;
  }

  const selectedInboxId =
    parsed.data.selectedInboxId &&
    inboxes.some((record) => record.id === parsed.data.selectedInboxId)
      ? parsed.data.selectedInboxId
      : (inboxes[0]?.id ?? null);

  if (selectedInboxId !== (parsed.data.selectedInboxId ?? null)) {
    changed = true;
  }

  return {
    inboxes,
    selectedInboxId,
    recovered: false,
    changed,
  };
}

function readSnapshot(
  storage: Storage | null,
  limit: number,
  nowIso: string,
): RecentInboxesSnapshot {
  if (!storage) {
    return {
      inboxes: [],
      selectedInboxId: null,
      recovered: false,
      changed: false,
    };
  }

  try {
    const raw = storage.getItem(RECENT_INBOX_STORAGE_KEY);
    if (!raw) {
      return {
        inboxes: [],
        selectedInboxId: null,
        recovered: false,
        changed: false,
      };
    }

    return sanitizeSnapshot(JSON.parse(raw), nowIso, limit);
  } catch {
    return {
      inboxes: [],
      selectedInboxId: null,
      recovered: true,
      changed: true,
    };
  }
}

function finalizeSnapshot(
  storage: Storage | null,
  snapshot: RecentInboxesSnapshot,
): RecentInboxesSnapshot {
  writeSnapshot(storage, snapshot);
  return {
    ...snapshot,
    changed: false,
  };
}

export function createRecentInboxId(
  address: string,
  createdAt: string,
  providerId: ProviderId,
): string {
  return `${providerId}:${createdAt}:${address.toLowerCase()}`;
}

export function createRecentInboxesStorage(options?: {
  storage?: Storage | null;
  limit?: number;
  now?: () => string;
}): RecentInboxesStorage {
  const storage = options?.storage ?? defaultStorage();
  const limit = options?.limit ?? RECENT_INBOX_LIMIT;
  const now = options?.now ?? (() => new Date().toISOString());

  function touchRecord(
    record: RecentInboxRecord,
    patch?: Partial<Pick<RecentInboxRecord, "expiresAt">>,
  ): RecentInboxRecord {
    return {
      ...record,
      expiresAt: patch?.expiresAt ?? record.expiresAt,
      lastOpenedAt: now(),
    };
  }

  function updateWith(
    mutator: (snapshot: RecentInboxesSnapshot) => RecentInboxesSnapshot,
  ): RecentInboxesSnapshot {
    const loaded = readSnapshot(storage, limit, now());
    const next = mutator(loaded);
    return finalizeSnapshot(storage, {
      inboxes: [...next.inboxes].sort(compareInboxes).slice(0, limit),
      selectedInboxId:
        next.selectedInboxId && next.inboxes.some((record) => record.id === next.selectedInboxId)
          ? next.selectedInboxId
          : (next.inboxes[0]?.id ?? null),
      recovered: loaded.recovered || next.recovered,
      changed: true,
    });
  }

  return {
    load() {
      const snapshot = readSnapshot(storage, limit, now());
      if (snapshot.changed) {
        return finalizeSnapshot(storage, snapshot);
      }

      return snapshot;
    },
    saveInbox(record, options) {
      return updateWith((snapshot) => {
        const inboxes = snapshot.inboxes
          .filter(
            (current) =>
              current.id !== record.id && current.capabilityToken !== record.capabilityToken,
          )
          .concat(touchRecord(record));

        return {
          ...snapshot,
          inboxes,
          selectedInboxId: options?.select ? record.id : snapshot.selectedInboxId,
        };
      });
    },
    selectInbox(id, patch) {
      return updateWith((snapshot) => ({
        ...snapshot,
        inboxes: snapshot.inboxes.map((record) =>
          record.id === id ? touchRecord(record, patch) : record,
        ),
        selectedInboxId: snapshot.inboxes.some((record) => record.id === id)
          ? id
          : snapshot.selectedInboxId,
      }));
    },
    removeInbox(id) {
      return updateWith((snapshot) => ({
        ...snapshot,
        inboxes: snapshot.inboxes.filter((record) => record.id !== id),
        selectedInboxId: snapshot.selectedInboxId === id ? null : snapshot.selectedInboxId,
      }));
    },
    clear() {
      if (!storage) {
        return;
      }

      try {
        storage.removeItem(RECENT_INBOX_STORAGE_KEY);
      } catch {
        /* ignore storage cleanup failures */
      }
    },
  };
}
