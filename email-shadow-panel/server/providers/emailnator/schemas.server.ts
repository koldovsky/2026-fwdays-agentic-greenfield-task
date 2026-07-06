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
export const EMAILNATOR_SUPPORTED_GENERATION_MODES = [
  "domain",
  "plusGmail",
  "dotGmail",
  "googleMail",
] as const;
export const EMAILNATOR_DEFAULT_GENERATION_MODE = "dotGmail";
export const EMAILNATOR_FALLBACK_GENERATION_MODE = "googleMail";
export const KNOWN_TEST_MARKERS = ["Shadow Panel Phase 0", "482731"] as const;

function hasAsciiControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.charCodeAt(0);
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }

  return false;
}

export const emailOptionSchema = z.enum(EMAILNATOR_SUPPORTED_GENERATION_MODES);
export type EmailnatorGenerationMode = z.infer<typeof emailOptionSchema>;

export const phase0MessageIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (value) => !hasAsciiControlCharacter(value),
    "messageId must be a bounded opaque identifier without ASCII control characters.",
  );

export const emailnatorProviderStateSchema = z.object({
  version: z.literal(1),
  address: z.string().email().optional(),
  cookieJar: z.record(z.string(), z.unknown()),
  observedCookieNames: z.array(z.string()).default([]),
  lastListedMessageIds: z.array(phase0MessageIdSchema).max(100).default([]),
  xsrfCookieName: z.string().default("XSRF-TOKEN"),
  xsrfHeaderName: z.string().default("X-XSRF-TOKEN"),
  lastBootstrapAt: z.string().datetime().optional(),
  lastUsedAt: z.string().datetime().optional(),
});

export type EmailnatorProviderState = z.infer<typeof emailnatorProviderStateSchema>;

export const emailnatorGenerateResponseSchema = z.object({
  email: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
});

export const emailnatorMessageSummarySchema = z.object({
  from: z.string().min(1),
  subject: z.string().min(1),
  time: z.string().min(1),
  messageID: phase0MessageIdSchema,
});

export type EmailnatorMessageSummary = z.infer<typeof emailnatorMessageSummarySchema>;

export const emailnatorMessageListResponseSchema = z.object({
  messageData: z.array(emailnatorMessageSummarySchema).optional(),
});

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
