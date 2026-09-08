import { randomBytes } from "node:crypto";

import type { ProviderInboxMessageSummary } from "../providers/inbox-provider.server.ts";
import {
  MESSAGE_REFERENCE_BYTES,
  MESSAGE_REFERENCE_MAX_ENTRIES,
  MESSAGE_REFERENCE_STATE_VERSION,
  messageReferenceSchema,
  messageReferenceStateSchema,
  safeListedMessageSchema,
  type AnonymousSessionState,
  type SafeListedMessage,
} from "./contracts.server.ts";
import { DomainError } from "./errors.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

function compareEntries(
  left: AnonymousSessionState["messageReferenceState"]["entries"][number],
  right: AnonymousSessionState["messageReferenceState"]["entries"][number],
): number {
  if (left.lastSeenAt !== right.lastSeenAt) {
    return right.lastSeenAt.localeCompare(left.lastSeenAt);
  }

  if (left.firstSeenAt !== right.firstSeenAt) {
    return right.firstSeenAt.localeCompare(left.firstSeenAt);
  }

  return left.reference.localeCompare(right.reference);
}

function createMessageReference(randomBytesImpl: RandomBytesFn): string {
  return messageReferenceSchema.parse(
    `msg_${Buffer.from(randomBytesImpl(MESSAGE_REFERENCE_BYTES)).toString("base64url")}`,
  );
}

export function createEmptyMessageReferenceState() {
  return messageReferenceStateSchema.parse({
    version: MESSAGE_REFERENCE_STATE_VERSION,
    maxEntries: MESSAGE_REFERENCE_MAX_ENTRIES,
    entries: [],
  });
}

export function reconcileMessageReferences(
  state: AnonymousSessionState["messageReferenceState"],
  messages: ProviderInboxMessageSummary[],
  now: Date,
  randomBytesImpl: RandomBytesFn = randomBytes,
): {
  messageReferenceState: AnonymousSessionState["messageReferenceState"];
  messages: SafeListedMessage[];
} {
  const nextByProviderId = new Map(
    state.entries.map((entry) => [entry.providerMessageId, { ...entry }] as const),
  );
  const seenProviderIds = new Set<string>();
  const nowIso = now.toISOString();
  const safeMessages: SafeListedMessage[] = [];

  for (const message of messages) {
    seenProviderIds.add(message.providerMessageId);
    const existing = nextByProviderId.get(message.providerMessageId);
    if (existing) {
      nextByProviderId.set(message.providerMessageId, {
        ...existing,
        lastSeenAt: nowIso,
      });
      safeMessages.push(
        safeListedMessageSchema.parse({
          reference: existing.reference,
          from: message.from,
          subject: message.subject,
          time: message.time,
        }),
      );
      continue;
    }

    const created = {
      reference: createMessageReference(randomBytesImpl),
      providerMessageId: message.providerMessageId,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
    };
    nextByProviderId.set(message.providerMessageId, created);
    safeMessages.push(
      safeListedMessageSchema.parse({
        reference: created.reference,
        from: message.from,
        subject: message.subject,
        time: message.time,
      }),
    );
  }

  const allEntries = [...nextByProviderId.values()];
  const currentEntries = allEntries.filter((entry) => seenProviderIds.has(entry.providerMessageId));
  const prunableEntries = allEntries
    .filter((entry) => !seenProviderIds.has(entry.providerMessageId))
    .sort(compareEntries);
  const allowedPrunableCount = Math.max(state.maxEntries - currentEntries.length, 0);
  const nextEntries = [...currentEntries, ...prunableEntries.slice(0, allowedPrunableCount)]
    .sort(compareEntries)
    .slice(0, state.maxEntries);

  return {
    messageReferenceState: messageReferenceStateSchema.parse({
      version: MESSAGE_REFERENCE_STATE_VERSION,
      maxEntries: state.maxEntries,
      entries: nextEntries,
    }),
    messages: safeMessages,
  };
}

export function resolveMessageReference(
  state: AnonymousSessionState["messageReferenceState"],
  reference: string,
): string {
  const parsedReference = messageReferenceSchema.safeParse(reference);
  if (!parsedReference.success) {
    throw new DomainError("INVALID_MESSAGE_REFERENCE", "Message reference validation failed.", {
      safeMessage: "The message reference is invalid.",
    });
  }

  const match = state.entries.find((entry) => entry.reference === parsedReference.data);
  if (!match) {
    throw new DomainError("INVALID_MESSAGE_REFERENCE", "Message reference could not be resolved.", {
      safeMessage: "The message reference is invalid or no longer available.",
    });
  }

  return match.providerMessageId;
}
