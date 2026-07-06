import { z } from "zod";

import {
  capabilityTokenSchema,
  messageReferenceSchema,
  safeListedMessageSchema,
  safeMessageDetailSchema,
} from "../session/contracts.server.ts";

export const publicRequestIdSchema = z
  .string()
  .regex(/^req_[A-Za-z0-9_-]{8,24}$/u, "requestId must be a bounded opaque identifier.");

export const publicErrorCodeSchema = z.enum([
  "ACTIVE_INBOX_LIMIT",
  "FORBIDDEN_ORIGIN",
  "INVALID_CAPABILITY",
  "INVALID_REQUEST",
  "INTERNAL_ERROR",
  "MESSAGE_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "OPERATION_IN_PROGRESS",
  "PROVIDER_UNAVAILABLE",
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "SESSION_EXPIRED",
  "SESSION_NOT_FOUND",
]);

export const publicErrorEnvelopeSchema = z.object({
  error: z.object({
    code: publicErrorCodeSchema,
    message: z.string().min(1).max(200),
    requestId: publicRequestIdSchema,
    retryable: z.boolean(),
  }),
});

export const publicInboxMetadataSchema = z.object({
  address: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const publicCreateInboxResponseSchema = z.object({
  data: z.object({
    capabilityToken: capabilityTokenSchema,
    inbox: publicInboxMetadataSchema,
  }),
});

export const publicListMessagesResponseSchema = z.object({
  data: z.object({
    inbox: publicInboxMetadataSchema,
    messages: z.array(safeListedMessageSchema),
  }),
});

export const publicMessageDetailResponseSchema = z.object({
  data: z.object({
    inbox: publicInboxMetadataSchema,
    message: safeMessageDetailSchema.extend({
      reference: messageReferenceSchema,
    }),
  }),
});

export const publicHealthResponseSchema = z.object({
  data: z.object({
    status: z.enum(["ok", "degraded"]),
  }),
});

export type PublicCreateInboxResponse = z.infer<typeof publicCreateInboxResponseSchema>;
export type PublicErrorEnvelope = z.infer<typeof publicErrorEnvelopeSchema>;
export type PublicHealthResponse = z.infer<typeof publicHealthResponseSchema>;
export type PublicListMessagesResponse = z.infer<typeof publicListMessagesResponseSchema>;
export type PublicMessageDetailResponse = z.infer<typeof publicMessageDetailResponseSchema>;
