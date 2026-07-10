import { z } from "zod";

import {
  emailnatorProviderStateSchema,
  phase0MessageIdSchema,
} from "../providers/emailnator/schemas.server.ts";

export const SESSION_RECORD_VERSION = 1;
export const SESSION_STATE_VERSION = 1;
export const MESSAGE_REFERENCE_STATE_VERSION = 1;
export const MESSAGE_REFERENCE_MAX_ENTRIES = 200;
export const CAPABILITY_TOKEN_BYTES = 32;
export const CAPABILITY_TOKEN_HASH_BYTES = 32;
export const VISITOR_HASH_BYTES = 32;
export const SESSION_ID_BYTES = 12;
export const MESSAGE_REFERENCE_BYTES = 9;
export const EMAIL_PROVIDER_ID = "emailnator";

const base64UrlSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/, "value must be URL-safe base64 without padding.");

export const sessionIdSchema = z
  .string()
  .regex(/^sess_[A-Za-z0-9_-]{12,}$/u, "sessionId must be a bounded opaque identifier.");

export const capabilityTokenSchema = base64UrlSchema
  .min(43)
  .max(128)
  .refine(
    (value) => value.length >= 43,
    "capabilityToken must provide at least 256 bits of entropy.",
  );

export const capabilityTokenHashSchema = base64UrlSchema
  .length(43)
  .describe("SHA-256 capability-token hash in base64url form.");

export const anonymousVisitorHashSchema = base64UrlSchema
  .length(43)
  .describe("HMAC-SHA-256 visitor hash in base64url form.");

export const providerIdSchema = z.literal(EMAIL_PROVIDER_ID);

export const messageReferenceSchema = z
  .string()
  .regex(/^msg_[A-Za-z0-9_-]{8,}$/u, "message reference must be a bounded opaque identifier.");

export const visitorIdentifierSchema = z.string().min(1).max(512);

export const messageReferenceEntrySchema = z.object({
  reference: messageReferenceSchema,
  providerMessageId: phase0MessageIdSchema,
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});

export const messageReferenceStateSchema = z.object({
  version: z.literal(MESSAGE_REFERENCE_STATE_VERSION),
  maxEntries: z.number().int().positive().max(MESSAGE_REFERENCE_MAX_ENTRIES),
  entries: z.array(messageReferenceEntrySchema).max(MESSAGE_REFERENCE_MAX_ENTRIES),
});

export const anonymousSessionStateSchema = z.object({
  version: z.literal(SESSION_STATE_VERSION),
  providerId: providerIdSchema,
  providerState: emailnatorProviderStateSchema,
  messageReferenceState: messageReferenceStateSchema,
});

export const persistedAnonymousSessionSchema = z.object({
  schemaVersion: z.literal(SESSION_RECORD_VERSION),
  sessionId: sessionIdSchema,
  capabilityTokenHash: capabilityTokenHashSchema,
  anonymousVisitorHash: anonymousVisitorHashSchema,
  inboxAddress: z.string().email(),
  encryptedSessionState: z.string().min(24).max(262_144),
  providerStateVersion: z.number().int().nonnegative(),
  providerId: providerIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const anonymousSessionSummarySchema = z.object({
  inboxAddress: z.string().email(),
  providerId: providerIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const createAnonymousSessionInputSchema = z.object({
  visitorIdentifier: visitorIdentifierSchema,
});

export const createAnonymousSessionResultSchema = z.object({
  capabilityToken: capabilityTokenSchema,
  session: anonymousSessionSummarySchema,
});

export const safeListedMessageSchema = z.object({
  reference: messageReferenceSchema,
  from: z.string().min(1),
  subject: z.string().min(1),
  time: z.string().min(1),
});

export const listSessionMessagesResultSchema = z.object({
  session: anonymousSessionSummarySchema,
  messages: z.array(safeListedMessageSchema),
});

export const safeMessageDetailSchema = z.object({
  contentType: z.string().min(1),
  bodyLength: z.number().int().nonnegative(),
  htmlBody: z.string().nullable().optional(),
  textBody: z.string().nullable().optional(),
  text: z.string(),
  textPreview: z.string(),
  markerFound: z.boolean(),
});

export const getSessionMessageDetailResultSchema = z.object({
  session: anonymousSessionSummarySchema,
  detail: safeMessageDetailSchema,
});

export type AnonymousSessionState = z.infer<typeof anonymousSessionStateSchema>;
export type AnonymousSessionSummary = z.infer<typeof anonymousSessionSummarySchema>;
export type CreateAnonymousSessionInput = z.infer<typeof createAnonymousSessionInputSchema>;
export type CreateAnonymousSessionResult = z.infer<typeof createAnonymousSessionResultSchema>;
export type GetSessionMessageDetailResult = z.infer<typeof getSessionMessageDetailResultSchema>;
export type ListSessionMessagesResult = z.infer<typeof listSessionMessagesResultSchema>;
export type PersistedAnonymousSession = z.infer<typeof persistedAnonymousSessionSchema>;
export type SafeListedMessage = z.infer<typeof safeListedMessageSchema>;
