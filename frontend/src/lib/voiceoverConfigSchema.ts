/**
 * Zod schema for VoiceoverConfigStep form validation (Phase 1 plan 03).
 *
 * Single source of truth for the 5-field voiceover config (provider +
 * providerBaseUrl + providerApiKey + voiceoverLanguage + voice). The
 * same schema is consumed by the `VoiceoverConfigStep` component
 * (gates the Start Voice-Over button) and the request body shape is
 * forward-compat with Plan 04's consolidated mock provider.
 *
 * The schema enforces:
 *  - `provider` is one of the locked provider IDs (D-03 — only
 *    OpenAI-compatible in this sprint; matches the F4 voice catalog
 *    that the TTS adapter consumes).
 *  - `providerBaseUrl` is a valid URL (the user-typed value lands
 *    here; the mock-accepts-any-value contract applies at submit
 *    time on the backend).
 *  - `providerApiKey` is non-empty (the in-process mock ignores
 *    it; the consolidated mock service is the consumer).
 *  - `voiceoverLanguage` is 2-5 char ISO 639-1 code (the
 *    backend `EpubService.resolve_voiceover_language` does the
 *    canonical first-spine rule; the SPA mirrors the lookup
 *    client-side to avoid a 422 round-trip).
 *  - `voice` is non-empty (the chosen voice id).
 */
import { z } from "zod";

export const voiceoverConfigSchema = z.object({
  provider: z.enum(["openai-compatible"]),
  providerBaseUrl: z.string().url("Enter a valid URL"),
  providerApiKey: z.string().min(1, "Enter the OpenAI API key"),
  voiceoverLanguage: z.string().min(2).max(5),
  voice: z.string().min(1, "Pick a voice"),
});

export type VoiceoverConfigFormValues = z.infer<typeof voiceoverConfigSchema>;
