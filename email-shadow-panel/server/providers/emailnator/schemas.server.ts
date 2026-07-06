import { z } from "zod";

export const EMAILNATOR_ORIGIN = "https://www.emailnator.com";
export const EMAILNATOR_BOOTSTRAP_PATH = "/";
export const EMAILNATOR_GENERATE_PATH = "/generate-email";
export const EMAILNATOR_MESSAGE_LIST_PATH = "/message-list";
export const EMAILNATOR_DELETE_PATH = "/delete-message";
export const EMAILNATOR_DEFAULT_TIMEOUT_MS = 10_000;
export const EMAILNATOR_MAX_RESPONSE_BYTES = 512 * 1024;
export const PHASE0_CAPSULE_TTL_MS = 15 * 60 * 1000;
export const PHASE0_CAPSULE_VERSION = "v1";
export const EMAILNATOR_ALLOWED_EMAIL_OPTIONS = [
  "domain",
  "plusGmail",
  "dotGmail",
  "googleMail",
] as const;
export const KNOWN_TEST_MARKERS = ["Shadow Panel Phase 0", "482731"] as const;

export const emailOptionSchema = z.enum(EMAILNATOR_ALLOWED_EMAIL_OPTIONS);

export const emailnatorProviderStateSchema = z.object({
  version: z.literal(1),
  address: z.string().email().optional(),
  cookieJar: z.record(z.string(), z.unknown()),
  observedCookieNames: z.array(z.string()).default([]),
  xsrfCookieName: z.string().default("XSRF-TOKEN"),
  xsrfHeaderName: z.string().default("X-XSRF-TOKEN"),
  lastBootstrapAt: z.string().datetime().optional(),
  lastUsedAt: z.string().datetime().optional(),
});

export type EmailnatorProviderState = z.infer<typeof emailnatorProviderStateSchema>;

export const emailnatorGenerateResponseSchema = z.object({
  email: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
});

export const emailnatorMessageSummarySchema = z.object({
  from: z.string().min(1),
  subject: z.string().min(1),
  time: z.string().min(1),
  messageID: z.string().min(1).max(200),
});

export type EmailnatorMessageSummary = z.infer<typeof emailnatorMessageSummarySchema>;

export const emailnatorMessageListResponseSchema = z.object({
  messageData: z.array(emailnatorMessageSummarySchema).optional(),
});

export const phase0MessageIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/, "messageId must be a bounded opaque identifier.");

export const phase0CapsuleSchema = z.string().min(24).max(4096);

export const phase0ProbeRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
  }),
  z.object({
    action: z.literal("list"),
    capsule: phase0CapsuleSchema,
  }),
  z.object({
    action: z.literal("detail"),
    capsule: phase0CapsuleSchema,
    messageId: phase0MessageIdSchema,
  }),
]);

export type Phase0ProbeRequest = z.infer<typeof phase0ProbeRequestSchema>;

export const phase0SessionPayloadSchema = z.object({
  version: z.literal(PHASE0_CAPSULE_VERSION),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
  state: emailnatorProviderStateSchema,
});

export type Phase0SessionPayload = z.infer<typeof phase0SessionPayloadSchema>;
