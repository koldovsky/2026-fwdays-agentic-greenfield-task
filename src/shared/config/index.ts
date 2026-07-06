// Public API for shared/config — env-derived constants, framework-free.
export {
  siteUrl,
  siteName,
  siteDescription,
  siteKeywords,
  absoluteUrl,
} from "./site";
export {
  getDatabaseUrl,
  getDatabaseSsl,
  getAnthropicApiKey,
  getOpenAiApiKey,
  getLlmProviderName,
  getLlmModel,
  getPaymentsProviderName,
  getPaymentsWebhookSecret,
  isPaymentsEmulatorEnabled,
  isCoverageJudgeEnabled,
  type LlmProviderName,
  type PaymentsProviderName,
} from "./env";
